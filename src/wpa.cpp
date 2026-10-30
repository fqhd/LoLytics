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
#include <unordered_set>
#include <array>
#include <random>
#include <numeric>

#include "Game.hpp"

static constexpr int N = 161;
static constexpr int EVENT_SIZE = 25;
static constexpr int HEADER_SIZE = 15;
static constexpr int NUM_BOOTSTRAP = 2000;
static constexpr uint32_t BOOTSTRAP_SEED = 0xC0FFEE;

// Adjust if your binary format uses a different event id for item sells.
static constexpr uint8_t EVENT_ITEM_PURCHASE = 4;
static constexpr uint8_t EVENT_ITEM_UNDO     = 5;
static constexpr uint8_t EVENT_ITEM_SELL     = 7;

struct LRModel {
    std::vector<double> means, stds, coefs;
    double intercept;
};

struct ItemInfo {
    std::string name;
    std::string type;
};

// One live purchase entry. If the item is later sold, sold=true and
// sellProb holds the model win probability at the moment of selling.
struct PurchaseEntry {
    double prob;       // win prob at purchase time
    bool   win;        // actual binary game outcome
    bool   sold;
    double sellProb;   // win prob at sell time (valid only if sold)
};

// Pre-aggregated stats for one item within one game.
struct PerGameItemStat {
    int    itemIdx;
    double sumP;
    double sumP2;
    double sumWin;     // sum of winValue (sellProb if sold, else actual outcome)
    int    count;
};

struct GameData {
    std::vector<PerGameItemStat> itemStats;
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
    if (!f) { std::cerr << "Warning: could not open " << path << "\n"; return result; }
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
    return id == 2421 || id == 3599 || id == 3600 || id == 3172 || id == 3171 ||
           id == 3168 || id == 3175 || id == 3173 || id == 3174 || id == 3170 || id == 2422;
}

static inline uint64_t make_key(uint8_t playerId, uint32_t itemId) {
    return (static_cast<uint64_t>(playerId) << 32) | itemId;
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

    size_t totalFiles = 0;
    for (const auto& dirEntry : fs::recursive_directory_iterator(root))
        if (dirEntry.is_regular_file()) totalFiles++;
    std::cout << "Found " << totalFiles << " game files\n";
    const size_t fileProgressStep = std::max<size_t>(1, totalFiles / 100);
    size_t processedFiles = 0;

    std::vector<GameData> games;
    std::unordered_map<uint32_t, int> itemToIdx;
    std::vector<uint32_t> idxToItem;
    std::unordered_map<uint32_t, int> itemTotalPurchases;  // surviving purchases only
    int totalGames = 0;

    for (const auto& dirEntry : fs::recursive_directory_iterator(root)) {
        if (!dirEntry.is_regular_file()) continue;

        ++processedFiles;
        if (processedFiles % fileProgressStep == 0 || processedFiles == totalFiles) {
            std::cout << "\rProcessing games: " << processedFiles << "/" << totalFiles
                      << " (" << static_cast<int>(100.0 * processedFiles / totalFiles)
                      << "%)" << std::flush;
        }

        std::vector<uint8_t> buffer;
        try { buffer = read_binary_file(dirEntry.path().string()); }
        catch (const std::exception& e) { std::cerr << e.what() << "\n"; continue; }

        if (buffer.size() < HEADER_SIZE) continue;

        const bool blueWon = buffer[10] != 0;
        const uint32_t eventCount = read_u32(buffer.data() + 11);
        if (buffer.size() < HEADER_SIZE + static_cast<size_t>(eventCount) * EVENT_SIZE) continue;

        Game game;
        // Keyed by (playerId, itemId); holds live purchase entries for this match.
        std::unordered_map<uint64_t, std::vector<PurchaseEntry>> active;

        for (uint32_t i = 0; i < eventCount; ++i) {
            const uint8_t* ev = buffer.data() + HEADER_SIZE + i * EVENT_SIZE;
            const uint8_t type = ev[0];
            game.updateWithEvent(ev);

            if (type == EVENT_ITEM_PURCHASE) {
                const uint32_t itemId = read_u32(ev + 5);
                if (is_ignored_item(itemId)) continue;
                const uint8_t pid = ev[9];
                const double blueProb = predict_prob(model, game.vectorizeState());
                PurchaseEntry pe;
                if (pid >= 1 && pid <= 5) {
                    pe.prob = blueProb;
                    pe.win  = blueWon;
                } else {
                    pe.prob = 1.0 - blueProb;
                    pe.win  = !blueWon;
                }
                pe.sold     = false;
                pe.sellProb = -1.0;
                active[make_key(pid, itemId)].push_back(pe);
            }
            else if (type == EVENT_ITEM_UNDO) {
                // Undo removes the purchase entirely (item never took effect).
                const uint32_t itemId = read_u32(ev + 10);
                if (itemId == 0) continue;
                const uint8_t pid = ev[9];
                auto it = active.find(make_key(pid, itemId));
                if (it != active.end() && !it->second.empty()) {
                    it->second.pop_back();
                }
            }
            else if (type == EVENT_ITEM_SELL) {
                // Sell: freeze the win probability at the moment of selling.
                // Adjust offsets if your sell event layout differs.
                const uint32_t itemId = read_u32(ev + 5);
                const uint8_t pid = ev[9];
                auto it = active.find(make_key(pid, itemId));
                if (it != active.end()) {
                    // Mark the most recent unsold entry as sold.
                    for (auto rit = it->second.rbegin(); rit != it->second.rend(); ++rit) {
                        if (!rit->sold) {
                            const double blueProb = predict_prob(model, game.vectorizeState());
                            rit->sellProb = (pid >= 1 && pid <= 5)
                                            ? blueProb
                                            : 1.0 - blueProb;
                            rit->sold = true;
                            break;
                        }
                    }
                }
            }
        }

        // Aggregate surviving entries for this game.
        GameData gd;
        std::unordered_map<int, PerGameItemStat> perItem;  // itemIdx -> aggregate
        for (auto& [key, vec] : active) {
            const uint32_t itemId = static_cast<uint32_t>(key & 0xFFFFFFFFu);
            for (const auto& pe : vec) {
                int idx;
                auto it = itemToIdx.find(itemId);
                if (it == itemToIdx.end()) {
                    idx = static_cast<int>(idxToItem.size());
                    itemToIdx[itemId] = idx;
                    idxToItem.push_back(itemId);
                } else {
                    idx = it->second;
                }

                PerGameItemStat& s = perItem[idx];
                s.itemIdx = idx;
                const double winValue = pe.sold ? pe.sellProb
                                                : (pe.win ? 1.0 : 0.0);
                s.sumP   += pe.prob;
                s.sumP2  += pe.prob * pe.prob;
                s.sumWin += winValue;
                s.count  += 1;
            }
        }

        for (auto& [idx, s] : perItem) {
            gd.itemStats.push_back(s);
            const uint32_t itemId = idxToItem[idx];
            itemTotalPurchases[itemId] += s.count;
        }

        games.push_back(std::move(gd));
        totalGames++;
    }

    if (totalFiles > 0) {
        std::cout << "\rProcessing games: " << totalFiles << "/" << totalFiles
                  << " (100%)" << std::endl;
    }

    if (totalGames == 0) { std::cerr << "No games processed\n"; return 1; }

    const int numItems = static_cast<int>(idxToItem.size());
    std::vector<std::vector<double>> bootWPA(numItems);
    std::vector<std::vector<double>> bootWPE(numItems);
    std::vector<std::vector<double>> bootWR (numItems);

    std::mt19937 rng(BOOTSTRAP_SEED);
    std::uniform_int_distribution<int> dist(0, totalGames - 1);

    std::vector<double> accSumP  (numItems, 0.0);
    std::vector<double> accSumWin(numItems, 0.0);
    std::vector<int>    accCount (numItems, 0);

    const int bootProgressStep = std::max(1, NUM_BOOTSTRAP / 100);

    for (int b = 0; b < NUM_BOOTSTRAP; ++b) {
        if ((b + 1) % bootProgressStep == 0 || b + 1 == NUM_BOOTSTRAP) {
            std::cout << "\rBootstrapping: " << (b + 1) << "/" << NUM_BOOTSTRAP
                      << " (" << static_cast<int>(100.0 * (b + 1) / NUM_BOOTSTRAP)
                      << "%)" << std::flush;
        }

        std::fill(accSumP.begin(),   accSumP.end(),   0.0);
        std::fill(accSumWin.begin(), accSumWin.end(), 0.0);
        std::fill(accCount.begin(),  accCount.end(),  0);

        for (int i = 0; i < totalGames; ++i) {
            const int g = dist(rng);
            for (const auto& s : games[g].itemStats) {
                accSumP  [s.itemIdx] += s.sumP;
                accSumWin[s.itemIdx] += s.sumWin;
                accCount [s.itemIdx] += s.count;
            }
        }

        for (int idx = 0; idx < numItems; ++idx) {
            if (accCount[idx] == 0) continue;
            const double n     = static_cast<double>(accCount[idx]);
            const double meanP = accSumP[idx]   / n;
            const double wr    = accSumWin[idx] / n;
            bootWPE[idx].push_back(meanP);
            bootWR [idx].push_back(wr);
            bootWPA[idx].push_back(wr - meanP);
        }
    }
    std::cout << "\rBootstrapping: " << NUM_BOOTSTRAP << "/" << NUM_BOOTSTRAP
              << " (100%)" << std::endl;

    auto meanOf = [](const std::vector<double>& v) {
        return std::accumulate(v.begin(), v.end(), 0.0) / static_cast<double>(v.size());
    };
    auto sdOf = [](const std::vector<double>& v) {
        const double m = std::accumulate(v.begin(), v.end(), 0.0) / static_cast<double>(v.size());
        double ss = 0.0;
        for (double x : v) { const double d = x - m; ss += d * d; }
        return (v.size() > 1) ? std::sqrt(ss / static_cast<double>(v.size() - 1)) : 0.0;
    };

    std::ofstream csv("lolytics/public/item_stats.csv");
    if (!csv) { std::cerr << "Failed to open item_stats.csv for writing\n"; return 1; }
    csv << "type,itemId,itemName,n,WPA,WPE,WR,SE(wpa),SE(p),SE(wr),pickrate,95% CI\n";

    std::cout << "Processed " << totalGames << " games\n";
    std::cout << "Writing stats for " << numItems << " items (B=" << NUM_BOOTSTRAP << ")\n";

    for (int idx = 0; idx < numItems; ++idx) {
        const uint32_t itemId = idxToItem[idx];
        const auto& wpaVec = bootWPA[idx];
        const auto& wpeVec = bootWPE[idx];
        const auto& wrVec  = bootWR [idx];
        if (wpaVec.size() < 2) continue;

        const double WPA   = meanOf(wpaVec);
        const double WPE   = meanOf(wpeVec);
        const double WR    = meanOf(wrVec);
        const double SEp   = sdOf(wpeVec);
        const double SEwr  = sdOf(wrVec);
        const double SEwpa = sdOf(wpaVec);

        const double ciLow  = WPA - 1.96 * SEwpa;
        const double ciHigh = WPA + 1.96 * SEwpa;

        const int n = itemTotalPurchases.count(itemId) ? itemTotalPurchases[itemId] : 0;
        // Stat-site convention: total purchases / total games (can exceed 100%).
        const double pickrate = totalGames > 0
                                ? static_cast<double>(n) / totalGames : 0.0;

        std::string name, type;
        auto it = itemInfo.find(itemId);
        if (it != itemInfo.end()) { name = it->second.name; type = it->second.type; }
        else                      { name = std::to_string(itemId); type = "Unknown"; }

        csv << csv_escape(type) << ","
            << itemId                         << ","
            << csv_escape(name)               << ","
            << n                              << ","
            << WPA                            << ","
            << WPE                            << ","
            << WR                             << ","
            << SEwpa                          << ","
            << SEp                            << ","
            << SEwr                           << ","
            << pickrate                       << ","
            << ciLow << "|" << ciHigh         << "\n";
    }

    std::cout << "CSV written to lolytics/public/item_stats.csv\n";
    return 0;
}