#include "raylib.h"
#include "raymath.h"
#include <curl/curl.h>
#include "../api_json/cJSON.h"
#include <iostream>
#include <string>
#include <vector>

#ifndef INCLUDE_HPP
#define INCLUDE_HPP

struct Plane {
	std::string callsign;
	float lat, lon, heading;
	bool active;
};

// --- DECLARAÇÃO DE FUNÇÕES ---
void FetchData(std::vector<Plane>& planes);
Vector2 GeoToPixel(float lat, float lon, int width, int height);

// --- CONFIGURAÇÕES DO MAPA (SÃO PAULO) ---
const float MAP_MIN_LAT = -24.00f;
const float MAP_MAX_LAT = -23.30f;
const float MAP_MIN_LON = -47.00f;
const float MAP_MAX_LON = -46.30f;

#endif