#pragma once

#include <array>
#include <cstdint>

struct Player {
    int killGold = 0;
    int kills = 0;
    int deaths = 0;
    int assists = 0;
    int baronTimer = 0;
    int elderTimer = 0;
    int deathTimer = 0;
    int level = 1;
};

struct Team {
    static constexpr int kPlayerCount = 5;
    static constexpr int kDragonCount = 6;
    static constexpr int kTowerCount = 11;
    static constexpr int kInhibCount = 3;

    std::array<Player, kPlayerCount> players;
    std::array<uint8_t, kDragonCount> drakes = {0, 0, 0, 0, 0, 0};
    uint8_t rifts = 0;
    uint8_t grubs = 0;
    std::array<int, kTowerCount> towers = {1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0};
    std::array<int, kInhibCount> inhibs = {0, 0, 0};
};

class Game {
public:
    static constexpr int kTeamCount = 2;
    static constexpr int kPlayerCount = 5;
    static constexpr int kAssistSlots = 10;
    static constexpr int kStateSize = 161;

    Game() = default;
    explicit Game(bool w) : win(w) {}

    std::array<Team, kTeamCount> teams;
    bool win = false;
    int time = 0;

    void updateWithEvent(const uint8_t* buf);
    void syncTimers(int deltaTime);
    void processChampionKill(uint8_t killerId, uint8_t victimId, uint32_t bounty, uint32_t shutdownBounty, const uint8_t* assistingIds, int32_t timestamp);
    void processBuildingKill(uint8_t buildingType, uint8_t laneType, uint8_t teamId, uint8_t towerType);
    void processMonsterKill(uint8_t killerId, uint8_t monsterType, uint8_t subType);
    void processLevelUp(uint8_t participantId);
    const double* vectorizeState();

private:
    void processTowerKill(uint8_t laneType, uint8_t teamId, uint8_t towerType);
    void processInhibitorKill(uint8_t laneType, uint8_t teamId);
    int getTowerId(uint8_t laneType, uint8_t teamId, uint8_t towerType) const;
    static double calculateTif(double timeMinutes);
    static double calculateDeathTimer(int level, int64_t timeMs);

    std::array<double, kStateSize> stateBuffer;
};
