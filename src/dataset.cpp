#include <algorithm>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <random>
#include <stdexcept>
#include <string>
#include <vector>
#include <cstring>

#include "Game.hpp"
#include "npy.hpp"

static constexpr int N_FEATURES = 161;
static constexpr int EVENT_SIZE = 25;
static constexpr int HEADER_SIZE = 15;
static constexpr int MIN_GAME_MS = 5 * 60 * 1000;

std::vector<uint8_t> read_binary_file(const std::string& path) {
    std::ifstream file(path, std::ios::binary | std::ios::ate);
    if (!file) throw std::runtime_error("Failed to open file: " + path);
    std::streamsize size = file.tellg();
    file.seekg(0, std::ios::beg);
    std::vector<uint8_t> buffer(static_cast<size_t>(size));
    if (!file.read(reinterpret_cast<char*>(buffer.data()), size))
        throw std::runtime_error("Failed to read file: " + path);
    return buffer;
}

static inline uint32_t read_u32(const uint8_t* p) {
    uint32_t v; std::memcpy(&v, p, 4); return v;
}

static inline int32_t read_i32(const uint8_t* p) {
    int32_t v; std::memcpy(&v, p, 4); return v;
}

bool sample_game(const std::vector<uint8_t>& buffer, std::mt19937& rng,
                 std::vector<float>& stateOut, uint8_t& labelOut) {
    if (buffer.size() < HEADER_SIZE) return false;

    const bool blueWon = buffer[10] != 0;
    const uint32_t eventCount = read_u32(buffer.data() + 11);
    if (eventCount == 0) return false;
    if (buffer.size() < HEADER_SIZE + static_cast<size_t>(eventCount) * EVENT_SIZE)
        return false;

    const uint8_t* lastEvent = buffer.data() + HEADER_SIZE + (eventCount - 1) * EVENT_SIZE;
    const int32_t lastTimestamp = read_i32(lastEvent + 1);
    if (lastTimestamp <= MIN_GAME_MS) return false;

    std::uniform_int_distribution<uint32_t> dist(0, eventCount - 1);
    const uint32_t targetIdx = dist(rng);
    const uint8_t* targetEvent = buffer.data() + HEADER_SIZE + targetIdx * EVENT_SIZE;
    const int32_t targetTimestamp = read_i32(targetEvent + 1);

    Game game;
    for (uint32_t i = 0; i < targetIdx; ++i) {
        const uint8_t* ev = buffer.data() + HEADER_SIZE + i * EVENT_SIZE;
        game.updateWithEvent(ev);
    }

    int delta = targetTimestamp - game.time;
    if (delta < 0) delta = 0;
    game.syncTimers(delta);
    game.time = targetTimestamp;

    const double* stateD = game.vectorizeState();
    stateOut.resize(N_FEATURES);
    for (int i = 0; i < N_FEATURES; ++i) stateOut[i] = static_cast<float>(stateD[i]);

    labelOut = blueWon ? 1 : 0;
    return true;
}

void build_split(const std::string& root, const std::string& outPrefix, uint32_t seed) {
    namespace fs = std::filesystem;

    std::vector<float> allStates;
    std::vector<uint8_t> allLabels;
    std::mt19937 rng(seed);
    int gamesProcessed = 0;
    int gamesSkipped = 0;

    if (!fs::exists(root)) {
        std::cerr << "Directory not found: " << root << "\n";
        return;
    }

    for (const auto& entry : fs::recursive_directory_iterator(root)) {
        if (!entry.is_regular_file()) continue;

        std::vector<uint8_t> buffer;
        try { buffer = read_binary_file(entry.path().string()); }
        catch (const std::exception& e) {
            std::cerr << e.what() << "\n";
            gamesSkipped++;
            continue;
        }

        std::vector<float> state;
        uint8_t label;
        if (!sample_game(buffer, rng, state, label)) {
            gamesSkipped++;
            continue;
        }

        allStates.insert(allStates.end(), state.begin(), state.end());
        allLabels.push_back(label);
        gamesProcessed++;

        if (gamesProcessed % 5000 == 0) {
            std::cout << "  processed " << gamesProcessed << " games\n";
        }
    }

    std::cout << outPrefix << ": " << gamesProcessed << " samples, "
              << gamesSkipped << " skipped\n";

    if (gamesProcessed == 0) {
        std::cerr << "No samples for " << outPrefix << ", skipping save\n";
        return;
    }

    {
        unsigned long shape[2] = {
            static_cast<unsigned long>(gamesProcessed),
            static_cast<unsigned long>(N_FEATURES)
        };
        npy::SaveArrayAsNumpy(outPrefix + "_states.npy", false, 2, shape, allStates.data());
    }
    {
        unsigned long shape[1] = { static_cast<unsigned long>(gamesProcessed) };
        npy::SaveArrayAsNumpy(outPrefix + "_labels.npy", false, 1, shape, allLabels.data());
    }
}

int main() {
    std::cout << "--- train split ---\n";
    build_split("dataset/train_bin", "train", 0);

    std::cout << "--- test split ---\n";
    build_split("dataset/test_bin", "test", 1);

    return 0;
}
