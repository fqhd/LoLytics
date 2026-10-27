cmake_minimum_required(VERSION 3.16)
project(wpa_calculator LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(calc_item_wpa src/main.cpp src/Game.cpp)
