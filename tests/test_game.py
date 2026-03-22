from model.game import create_players

def test_create_players():
    players = create_players()
    for p in players:
        assert p['kill_gold'] == 0
        assert p['kills'] == 0
        assert p['deaths'] == 0
        assert p['assists'] == 0
        assert p['baron_timer'] == 0
        assert p['elder_timer'] == 0
        assert p['death_timer'] == 0
        assert p['level'] == 1