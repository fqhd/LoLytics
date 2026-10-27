#include <algorithm>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>
#include <cstdio>
#include <cmath>
#include <cstring>
#include <unordered_map>
#include <array>

#include "Game.hpp"

static constexpr int N = 161;
static constexpr int EVENT_SIZE = 25;
static constexpr int HEADER_SIZE = 15;
static constexpr int NUM_BINS = 10;

struct LRModel {
    std::vector<double> means, stds, coefs;
    double intercept;
};

struct Entry {
    double prob;
    bool win;
};

struct ItemInfo {
    std::string name;
    std::string type;
};

bool load_lr(const char* path, LRModel& m) {
    FILE* f = std::fopen(path, "rb");
    if (!f) return false;
    m.means.resize(N); m.stds.resize(N); m.coefs.resize(N);
    std::fread(m.means.data(), sizeof(double), N, f);
    std::fread(m.stds.data(),  sizeof(double), N, f);
    std::fread(m.coefs.data(), sizeof(double), N, f);
    std::fread(&m.intercept,   sizeof(double), 1, f);
    std::fclose(f);
    return true;
}

std::unordered_map<uint32_t, ItemInfo> load_item_info(const char* path) {
    std::unordered_map<uint32_t, ItemInfo> result;
    std::ifstream f(path);
    if (!f) {
        std::cerr << "Warning: could not open " << path << "\n";
        return result;
    }
    std::string line;
    while (std::getline(f, line)) {
        if (line.empty()) continue;
        const size_t sp1 = line.find(' ');
        if (sp1 == std::string::npos) continue;
        const size_t sp2 = line.find(' ', sp1 + 1);
        if (sp2 == std::string::npos) continue;
        const std::string type = line.substr(0, sp1);
        const uint32_t id = static_cast<uint32_t>(std::stoul(line.substr(sp1 + 1, sp2 - sp1 - 1)));
        std::string name = line.substr(sp2 + 1);
        if (!name.empty() && name.back() == '\r') name.pop_back();
        result[id] = {name, type};
    }
    return result;
}

double predict_prob(const LRModel& m, const double* x) {
    double z = m.intercept;
    for (int i = 0; i < N; ++i) {
        double xs = (x[i] - m.means[i]) / m.stds[i];
        z += m.coefs[i] * xs;
    }
    return 1.0 / (1.0 + std::exp(-z));
}

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

static std::string csv_escape(const std::string& s) {
    if (s.find(',') == std::string::npos &&
        s.find('"') == std::string::npos &&
        s.find('\n') == std::string::npos) return s;
    std::string out = "\"";
    for (char c : s) { if (c == '"') out += "\"\""; else out += c; }
    out += "\"";
    return out;
}

static inline bool is_ignored_item(uint32_t id) {
    return id == 2421 || id == 3599 || id == 3600 || id == 3172 || id == 3171 || id == 3168 || id == 3175 || id == 3173 || id == 3174 || id == 3170 || id == 2422;
}

int main() {
    LRModel model;
    if (!load_lr("logreg.bin", model)) {
        std::cerr << "Failed to load LR model\n";
        return 1;
    }

    const auto itemInfo = load_item_info("item_mapping.txt");
    std::cout << "Loaded " << itemInfo.size() << " item mappings\n";

    namespace fs = std::filesystem;
    const fs::path root = "dataset/test_bin";
    if (!fs::exists(root)) {
        std::cerr << "Directory not found: " << root << "\n";
        return 1;
    }

    std::unordered_map<uint32_t, std::vector<Entry>> predictions;
    std::unordered_map<uint32_t, int> itemGameCounts;
    int totalGames = 0;

    for (const auto& dirEntry : fs::recursive_directory_iterator(root)) {
        if (!dirEntry.is_regular_file()) continue;

        std::vector<uint8_t> buffer;
        try { buffer = read_binary_file(dirEntry.path().string()); }
        catch (const std::exception& e) { std::cerr << e.what() << "\n"; continue; }

        if (buffer.size() < HEADER_SIZE) continue;

        const bool blueWon = buffer[10] != 0;
        const uint32_t eventCount = read_u32(buffer.data() + 11);
        if (buffer.size() < HEADER_SIZE + static_cast<size_t>(eventCount) * EVENT_SIZE) continue;

        Game game;
        std::unordered_map<uint32_t, int> gameItemCounts;

        for (uint32_t i = 0; i < eventCount; ++i) {
            const uint8_t* ev = buffer.data() + HEADER_SIZE + i * EVENT_SIZE;
            const uint8_t type = ev[0];
            game.updateWithEvent(ev);

            if (type == 4) {
                const uint32_t itemId = read_u32(ev + 5);
                if (is_ignored_item(itemId)) continue;
                const uint8_t pid = ev[9];
                const double blueProb = predict_prob(model, game.vectorizeState());
                Entry e;
                if (pid >= 1 && pid <= 5) { e.prob = blueProb; e.win = blueWon; }
                else                      { e.prob = 1.0 - blueProb; e.win = !blueWon; }
                predictions[itemId].push_back(e);
                gameItemCounts[itemId]++;
            } else if (type == 5) {
                const uint32_t beforeId = read_u32(ev + 10);
                if (beforeId == 0) continue;
                auto it = predictions.find(beforeId);
                if (it != predictions.end() && !it->second.empty()) {
                    it->second.pop_back();
                    gameItemCounts[beforeId]--;
                }
            }
        }

        for (auto& [itemId, cnt] : gameItemCounts) {
            if (cnt > 0) itemGameCounts[itemId]++;
        }
        totalGames++;
    }

    std::vector<uint32_t> itemIds;
    itemIds.reserve(predictions.size());
    for (const auto& kv : predictions) itemIds.push_back(kv.first);
    std::sort(itemIds.begin(), itemIds.end());

    std::ofstream csv("lolytics/public/item_stats.csv");
    if (!csv) {
        std::cerr << "Failed to open item_stats.csv for writing\n";
        return 1;
    }
    csv << "type,itemId,itemName,n,WPA,WPE,WR,SE(p),SD(wr),pickrate,95% CI,ECE\n";

    std::cout << "Processed " << totalGames << " games\n";
    std::cout << "Writing stats for " << itemIds.size() << " items\n";

    for (uint32_t itemId : itemIds) {
        const auto& vec = predictions[itemId];
        const int n = static_cast<int>(vec.size());
        if (n == 0) continue;

        double sumP = 0, sumP2 = 0;
        int nWin = 0;
        for (const auto& e : vec) {
            sumP += e.prob;
            sumP2 += e.prob * e.prob;
            if (e.win) nWin++;
        }
        const double meanProb = sumP / n;
        const double WR = static_cast<double>(nWin) / n;

        double SEp = 0.0;
        if (n > 1) {
            const double varP = (sumP2 - n * meanProb * meanProb) / (n - 1);
            SEp = std::sqrt(std::max(varP, 0.0) / n);
        }

        const double SDwr = std::sqrt(WR * (1.0 - WR) / n);
        const double WPE = meanProb;
        const double WPA = WR - meanProb;

        const int gamesWithItem = itemGameCounts.count(itemId) ? itemGameCounts[itemId] : 0;
        const double pickrate = totalGames > 0
            ? static_cast<double>(gamesWithItem) / totalGames : 0.0;

        const double seWPA = std::sqrt(SEp * SEp + SDwr * SDwr);
        const double halfCI = 1.96 * seWPA;
        const double ciLow = WPA - halfCI;
        const double ciHigh = WPA + halfCI;

        std::array<int, NUM_BINS> binCount{};
        std::array<double, NUM_BINS> binSumP{}, binSumY{};
        for (const auto& e : vec) {
            int b = static_cast<int>(e.prob * NUM_BINS);
            if (b >= NUM_BINS) b = NUM_BINS - 1;
            if (b < 0) b = 0;
            binCount[b]++;
            binSumP[b] += e.prob;
            binSumY[b] += e.win ? 1.0 : 0.0;
        }
        double ece = 0.0;
        for (int b = 0; b < NUM_BINS; ++b) {
            if (binCount[b] == 0) continue;
            const double acc  = binSumY[b] / binCount[b];
            const double conf = binSumP[b] / binCount[b];
            ece += (static_cast<double>(binCount[b]) / n) * std::abs(acc - conf);
        }

        std::string name, type;
        auto it = itemInfo.find(itemId);
        if (it != itemInfo.end()) {
            name = it->second.name;
            type = it->second.type;
        } else {
            name = std::to_string(itemId);
            type = "Unknown";
        }

        csv << csv_escape(type) << ","
            << itemId << ","
            << csv_escape(name) << ","
            << n << ","
            << WPA << ","
            << WPE << ","
            << WR << ","
            << SEp << ","
            << SDwr << ","
            << pickrate << ","
            << ciLow << "|" << ciHigh << ","
            << ece << "\n";
    }

    std::cout << "CSV written to item_stats.csv\n";
    return 0;
}
