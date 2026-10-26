import torch
from torch import nn

NUM_CHAMPS = 173

def _init_weights(module):
    if isinstance(module, nn.Linear):
        nn.init.xavier_uniform_(module.weight)
        if module.bias is not None:
            nn.init.zeros_(module.bias)
    elif isinstance(module, nn.Embedding):
        nn.init.normal_(module.weight, std=0.02)
    elif isinstance(module, nn.LayerNorm):
        nn.init.ones_(module.weight)
        nn.init.zeros_(module.bias)


class CrossAttnBlock(nn.Module):
    def __init__(self, d_model, nhead, dim_ff, dropout):
        super().__init__()
        self.self_attn = nn.MultiheadAttention(
            d_model, nhead, batch_first=True, dropout=dropout
        )
        self.cross_attn = nn.MultiheadAttention(
            d_model, nhead, batch_first=True, dropout=dropout
        )
        self.ff = nn.Sequential(
            nn.Linear(d_model, dim_ff),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(dim_ff, d_model),
        )
        self.norm1 = nn.LayerNorm(d_model)
        self.norm2 = nn.LayerNorm(d_model)
        self.norm3 = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, h, other):
        # Self-attention.
        a, _ = self.self_attn(h, h, h, need_weights=False)
        h = self.norm1(h + self.dropout(a))
        # Cross-attention to the other team.
        c, _ = self.cross_attn(h, other, other, need_weights=False)
        h = self.norm2(h + self.dropout(c))
        # Feedforward.
        f = self.ff(h)
        h = self.norm3(h + self.dropout(f))
        return h


class DraftTransformer(nn.Module):
    def __init__(
        self,
        num_champs: int = NUM_CHAMPS,
        d_model: int = 192,
        nhead: int = 8,
        num_layers: int = 6,
        dim_ff: int = 512,
        dropout: float = 0.2,
        champ_strength_init: torch.Tensor = None,
    ):
        super().__init__()
        self.d_model = d_model

        self.champ_emb = nn.Embedding(num_champs, d_model)
        self.pos_emb = nn.Embedding(5, d_model)
        self.strength_emb = nn.Embedding(num_champs, 1)
        self.strength_proj = nn.Linear(1, d_model)

        self.blocks = nn.ModuleList([
            CrossAttnBlock(d_model, nhead, dim_ff, dropout)
            for _ in range(num_layers)
        ])
        self.final_norm = nn.LayerNorm(d_model)

        # Antisymmetric head over the difference vector d (width d_model).
        self.mlp = nn.Sequential(
            nn.Linear(d_model, d_model),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, d_model // 2),
            nn.GELU(),
            nn.Dropout(dropout),
            nn.Linear(d_model // 2, 1),
        )

        self.side_bias = nn.Parameter(torch.zeros(1))

        self.apply(_init_weights)
        if champ_strength_init is not None:
            with torch.no_grad():
                self.strength_emb.weight.copy_(champ_strength_init)
        else:
            nn.init.zeros_(self.strength_emb.weight)

    def _encode_team(self, champs, strength):
        """champs: (B, 5) int, strength: (B, 5) float scalar per pick."""
        B, L = champs.shape
        pos = torch.arange(L, device=champs.device).unsqueeze(0).expand(B, L)
        h = self.champ_emb(champs) + self.pos_emb(pos)
        s = strength.unsqueeze(-1)                     # (B, 5, 1)
        h = h + self.strength_proj(s)                  # (B, 5, d_model)
        return h

    def forward(self, x):
        # x: (B, 10) int64
        blue = x[:, :5]
        red = x[:, 5:]

        b_strength = self.strength_emb(blue).squeeze(-1)   # (B, 5)
        r_strength = self.strength_emb(red).squeeze(-1)

        b = self._encode_team(blue, b_strength)
        r = self._encode_team(red, r_strength)

        for block in self.blocks:
            # Each block sees the other team's current representation.
            # We compute both directions in parallel so the two teams can't
            # see each other's updated state mid-block — keeps the swap
            # symmetry exact.
            b_new = block(b, r)
            r_new = block(r, b)
            b, r = b_new, r_new

        b = self.final_norm(b.mean(dim=1))
        r = self.final_norm(r.mean(dim=1))

        d = b - r

        # Antisymmetric score: 0.5 * (f(d) - f(-d)).
        score_anti = 0.5 * (
            self.mlp(d).squeeze(-1) - self.mlp(-d).squeeze(-1)
        )
        score = score_anti + self.side_bias

        return torch.stack([score, -score], dim=-1)
