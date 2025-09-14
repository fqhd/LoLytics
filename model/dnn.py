import torch
from torch import nn
import json

class DNN(nn.Module):
    def __init__(self, stats, num_champions=171, embedding_dim=8):
        super().__init__()
        self.champion_indices = torch.tensor([0, 12, 24, 36, 48, 101, 113, 125, 137, 149])

        # Trainable embedding layer
        self.embedding = nn.Embedding(num_champions, embedding_dim)

        # Input size is original features (without champion IDs) + embedding features
        input_dim = 203 - len(self.champion_indices) + len(self.champion_indices) * embedding_dim

        self.fc = nn.Sequential(
            nn.Linear(input_dim, 256),
            nn.ReLU(),
            nn.Linear(256, 256),
            nn.ReLU(),
            nn.Linear(256, 128),
            nn.ReLU(),
            nn.Linear(128, 128),
            nn.ReLU(),
            nn.Linear(128, 1)
        )

        # Stat indices
        self.kill_indices = torch.tensor([0, 11, 22, 33, 44, 96, 107, 118, 129, 140])
        self.death_indices = torch.tensor([1, 12, 23, 34, 45, 97, 108, 119, 130, 141])
        self.assist_indices = torch.tensor([2, 13, 24, 35, 46, 98, 109, 120, 131, 142])
        self.gold_indices = torch.tensor([6, 17, 28, 39, 50, 102, 113, 124, 135, 146])
        self.cs_indices = torch.tensor([8, 19, 30, 41, 52, 104, 115, 126, 137, 148])
        self.baron_indices = torch.tensor([3, 14, 25, 36, 47, 99, 110, 121, 132, 143])
        self.elder_indices = torch.tensor([4, 15, 26, 37, 48, 100, 111, 122, 133, 144])
        self.death_timer_indices = torch.tensor([5, 16, 27, 38, 49, 101, 112, 123, 134, 145])
        self.level_indices = torch.tensor([7, 18, 29, 40, 51, 103, 114, 125, 136, 147])
        self.x_indices = torch.tensor([9, 20, 31, 42, 53, 105, 116, 127, 138, 149])
        self.y_indices = torch.tensor([10, 21, 32, 43, 54, 106, 117, 128, 139, 150])

        # Load stats for normalization
        with open(stats) as f:
            self.stats = json.load(f)

        self.register_buffer('kills_mean', torch.tensor(self.stats['kills']['mean']))
        self.register_buffer('kills_std', torch.tensor(self.stats['kills']['std']))

        self.register_buffer('deaths_mean', torch.tensor(self.stats['deaths']['mean']))
        self.register_buffer('deaths_std', torch.tensor(self.stats['deaths']['std']))

        self.register_buffer('assists_mean', torch.tensor(self.stats['assists']['mean']))
        self.register_buffer('assists_std', torch.tensor(self.stats['assists']['std']))

        self.register_buffer('gold_mean', torch.tensor(self.stats['gold']['mean']))
        self.register_buffer('gold_std', torch.tensor(self.stats['gold']['std']))

        self.register_buffer('creepscore_mean', torch.tensor(self.stats['creepscore']['mean']))
        self.register_buffer('creepscore_std', torch.tensor(self.stats['creepscore']['std']))

    def normalize(self, x):
        x[:, self.kill_indices] = (x[:, self.kill_indices] - self.kills_mean) / self.kills_std
        x[:, self.death_indices] = (x[:, self.death_indices] - self.deaths_mean) / self.deaths_std
        x[:, self.assist_indices] = (x[:, self.assist_indices] - self.assists_mean) / self.assists_std
        x[:, self.gold_indices] = (x[:, self.gold_indices] - self.gold_mean) / self.gold_std
        x[:, self.cs_indices] = (x[:, self.cs_indices] - self.creepscore_mean) / self.creepscore_std

        x[:, self.baron_indices] /= 3 * 60
        x[:, self.elder_indices] /= 2 * 60 + 30
        x[:, self.death_timer_indices] /= 79
        x[:, self.level_indices] /= 18
        x[:, self.x_indices] /= 14500
        x[:, self.y_indices] /= 14500
        x[:, -1] /= 30

        x[:, 177] /= 3
        x[:, 81] /= 3

        x[:, 93] /= 5 * 60
        x[:, 94] /= 5 * 60
        x[:, 95] /= 5 * 60

        x[:, 189] /= 5 * 60
        x[:, 190] /= 5 * 60
        x[:, 191] /= 5 * 60

        x[:, 92] /= 3 * 60
        x[:, 91] /= 3 * 60
        x[:, 188] /= 3 * 60
        x[:, 187] /= 3 * 60

    def forward(self, x):
        B = x.size(0)

        # Champion IDs -> embeddings
        champion_ids = x[:, self.champion_indices].long()
        embedded = self.embedding(champion_ids)  # (B, num_champs, embedding_dim)
        embedded_flat = embedded.view(B, -1)

        # Remove champion ID columns from x
        mask = torch.ones(x.size(1), dtype=torch.bool, device=x.device)
        mask[self.champion_indices] = False
        x_non_cat = x[:, mask].float()

        self.normalize(x_non_cat)

        # Concatenate normalized stats + embeddings
        x_final = torch.cat([x_non_cat, embedded_flat], dim=1)

        return self.fc(x_final)
