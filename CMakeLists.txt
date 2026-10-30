cmake_minimum_required(VERSION 3.16)
project(wpa_calculator LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(wpa src/wpa.cpp src/Game.cpp)
add_executable(dataset src/dataset.cpp src/Game.cpp)
