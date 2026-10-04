from server.utils import calculate_deltas

def test_deltas():
    a = [0, 1, 0, 2, 3, 5, 4, 2, 3, 3]
    targets = [1, 2, 2, -2, 0]
    deltas = calculate_deltas(a)

    assert len(deltas) == len(targets)
    for i in range(len(deltas)):
        assert deltas[i] == targets[i]
