#include "Game.hpp"
#include <algorithm>
#include <cmath>
#include <cstring>

double Game::calculateTif(double timeMinutes) {
    if (timeMinutes >= 0 && timeMinutes < 15) return 0.0;
    else if (timeMinutes >= 15 && timeMinutes < 30) return std::ceil(2 * (timeMinutes - 15)) * 0.425;
    else if (timeMinutes >= 30 && timeMinutes < 45) return 12.75 + std::ceil(2 * (timeMinutes - 30)) * 0.3;
    else if (timeMinutes >= 45 && timeMinutes < 55) return 21.75 + std::ceil(2 * (timeMinutes - 45)) * 1.45;
    return 50.0;
}

double Game::calculateDeathTimer(int level, int64_t timeMs) {
    static constexpr double kBrw[] = {10.0, 10.0, 12.0, 12.0, 14.0, 16.0, 20.0, 25.0, 28.0, 32.5, 35.0, 37.5, 40.0, 42.5, 45.0, 47.5, 50.0, 52.5};
    const double currentBrw = kBrw[level - 1];
    const double currentTif = calculateTif(static_cast<double>(timeMs) / 60000.0) / 100.0;
    return currentBrw + currentBrw * currentTif;
}

void Game::processChampionKill(uint8_t killerId, uint8_t victimId, uint32_t bounty, uint32_t shutdownBounty, const uint8_t* assistingIds, int32_t timestamp) {
    if (killerId >= 1 && killerId <= 10) {
        const int kIdx = killerId - 1;
        Player& killer = teams[kIdx / kPlayerCount].players[kIdx % kPlayerCount];
        killer.killGold += static_cast<int>(bounty) + static_cast<int>(shutdownBounty);
        killer.kills += 1;
    }
    if (victimId < 1 || victimId > 10) return;
    const int vIdx = victimId - 1;
    Player& victim = teams[vIdx / kPlayerCount].players[vIdx % kPlayerCount];
    for (int i = 0; i < kAssistSlots; ++i) {
        const uint8_t pid = assistingIds[i];
        if (pid < 1 || pid > 10) continue;
        const int aIdx = pid - 1;
        teams[aIdx / kPlayerCount].players[aIdx % kPlayerCount].assists += 1;
    }
    victim.deaths += 1;
    victim.baronTimer = 0;
    victim.elderTimer = 0;
    const int level = std::clamp(victim.level, 1, 18);
    victim.deathTimer = static_cast<int>(std::llround(calculateDeathTimer(level, timestamp) * 1000.0));
}

int Game::getTowerId(uint8_t laneType, uint8_t teamId, uint8_t towerType) const {
    const int teamIdx = static_cast<int>(teamId) / 100 - 1;
    int towerId = 0;
    if (laneType == 2) towerId = 6;
    else if (laneType == 1) towerId = 3;
    if (towerType == 2) towerId += 1;
    else if (towerType == 1) towerId += 2;
    else if (towerType == 0) towerId = (teams[teamIdx].towers[9] > 0) ? 10 : 9;
    return towerId;
}

void Game::processTowerKill(uint8_t laneType, uint8_t teamId, uint8_t towerType) {
    const int towerId = getTowerId(laneType, teamId, towerType);
    const int teamIdx = static_cast<int>(teamId) / 100 - 1;
    teams[teamIdx].towers[towerId] = (towerId == 9 || towerId == 10) ? 180000 : 0;
}

void Game::processInhibitorKill(uint8_t laneType, uint8_t teamId) {
    int lane = 0;
    if (laneType == 1) lane = 1;
    else if (laneType == 2) lane = 2;
    const int teamIdx = static_cast<int>(teamId) / 100 - 1;
    teams[teamIdx].inhibs[lane] = 300000;
}

void Game::processBuildingKill(uint8_t buildingType, uint8_t laneType, uint8_t teamId, uint8_t towerType) {
    if (buildingType == 0) processTowerKill(laneType, teamId, towerType);
    else if (buildingType == 1) processInhibitorKill(laneType, teamId);
}

void Game::processMonsterKill(uint8_t killerId, uint8_t monsterType, uint8_t subType) {
    if (killerId < 1 || killerId > 10) return;
    const int kIdx = killerId - 1;
    Team& team = teams[kIdx / kPlayerCount];
    if (monsterType == 0) {
        if (subType == 6) {
            for (int i = 0; i < Team::kPlayerCount; ++i) {
                Player& p = team.players[i];
                if (p.deathTimer == 0) p.elderTimer = 150000;
            }
        } else {
            team.drakes[subType] += 1;
        }
    } else if (monsterType == 1) team.rifts += 1;
    else if (monsterType == 2) team.grubs += 1;
    else if (monsterType == 3) {
        for (int i = 0; i < Team::kPlayerCount; ++i) {
            Player& p = team.players[i];
            if (p.deathTimer == 0) p.baronTimer = 180000;
        }
    }
}

void Game::processLevelUp(uint8_t participantId) {
    if (participantId < 1 || participantId > 10) return;
    const int idx = participantId - 1;
    teams[idx / kPlayerCount].players[idx % kPlayerCount].level += 1;
}

void Game::updateWithEvent(const uint8_t* buf) {
    const uint8_t evType = buf[0];
    int32_t timestamp;
    std::memcpy(&timestamp, buf + 1, sizeof(timestamp));

    syncTimers(std::max(timestamp - time, 0));

    if (evType == 0) {
        uint32_t bounty, shutdownBounty;
        std::memcpy(&bounty, buf + 15, sizeof(bounty));
        std::memcpy(&shutdownBounty, buf + 20, sizeof(shutdownBounty));
        processChampionKill(buf[19], buf[24], bounty, shutdownBounty, buf + 5, timestamp);
    } else if (evType == 1) {
        processBuildingKill(buf[5], buf[6], buf[7], buf[9]);
    } else if (evType == 2) {
        processMonsterKill(buf[5], buf[6], buf[7]);
    } else if (evType == 3) {
        processLevelUp(buf[6]);
    }

    time = timestamp;
}

void Game::syncTimers(int deltaTime) {
    for (Team& team : teams) {
        for (int i = 0; i < Team::kPlayerCount; ++i) {
            Player& p = team.players[i];
            p.baronTimer = std::max(p.baronTimer - deltaTime, 0);
            p.elderTimer = std::max(p.elderTimer - deltaTime, 0);
            p.deathTimer = std::max(p.deathTimer - deltaTime, 0);
        }
        team.towers[9] = std::max(team.towers[9] - deltaTime, 0);
        team.towers[10] = std::max(team.towers[10] - deltaTime, 0);
        for (int i = 0; i < Team::kInhibCount; ++i) team.inhibs[i] = std::max(team.inhibs[i] - deltaTime, 0);
    }
}

const double* Game::vectorizeState() {
    stateBuffer.fill(0.0);
    int idx = 0;

    for (const Team& team : teams) {
        for (const Player& p : team.players) {
            stateBuffer[idx++] = static_cast<double>(p.killGold);
            stateBuffer[idx++] = static_cast<double>(p.kills);
            stateBuffer[idx++] = static_cast<double>(p.deaths);
            stateBuffer[idx++] = static_cast<double>(p.assists);
            stateBuffer[idx++] = static_cast<double>(p.baronTimer);
            stateBuffer[idx++] = static_cast<double>(p.elderTimer);
            stateBuffer[idx++] = static_cast<double>(p.deathTimer);
            stateBuffer[idx++] = static_cast<double>(p.level);
        }

        const int drakeBase = idx;
        int slot = 0;
        for (int type = 0; type < Team::kDragonCount && slot < 4; ++type) {
            for (int c = 0; c < team.drakes[type] && slot < 4; ++c) {
                stateBuffer[drakeBase + slot * Team::kDragonCount + type] = 1.0;
                slot++;
            }
        }
        idx += 4 * Team::kDragonCount;

        stateBuffer[idx++] = static_cast<double>(team.rifts);
        stateBuffer[idx++] = static_cast<double>(team.grubs);
        for (int t = 0; t < Team::kTowerCount; ++t) stateBuffer[idx++] = static_cast<double>(team.towers[t]);
        for (int i = 0; i < Team::kInhibCount; ++i) stateBuffer[idx++] = static_cast<double>(team.inhibs[i]);
    }

    stateBuffer[idx++] = static_cast<double>(time);
    return stateBuffer.data();
}
