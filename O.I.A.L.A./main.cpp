#include "raylib.h"
#include "raymath.h"
#include <curl/curl.h>
#include "cJSON.h"
#include <iostream>
#include <string>
#include <vector>

// --- CONFIGURAÇÕES DO MAPA (SÃO PAULO) ---
const float MAP_MIN_LAT = -24.00f;
const float MAP_MAX_LAT = -23.30f;
const float MAP_MIN_LON = -47.00f;
const float MAP_MAX_LON = -46.30f;

struct Plane {
	std::string callsign;
	float lat, lon, heading;
	bool active;
};

// --- FUNÇÃO DE AUXÍLIO PARA CURL ---
size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* s) {
	size_t newLength = size * nmemb;
	s->append((char*)contents, newLength);
	return newLength;
}

// --- CONVERSÃO GEOGRÁFICA PARA PIXEL ---
Vector2 GeoToPixel(float lat, float lon, int width, int height) {
	float x = (lon - MAP_MIN_LON) / (MAP_MAX_LON - MAP_MIN_LON) * width;
	// Em telas, o Y cresce para baixo, por isso invertemos a conta da latitude
	float y = (MAP_MAX_LAT - lat) / (MAP_MAX_LAT - MAP_MIN_LAT) * height;
	return { x, y };
}

// --- BUSCA DE DADOS NA API ---
void FetchData(std::vector<Plane>& planes) {
	CURL* curl = curl_easy_init();
	std::string response;
	
	if (curl) {
		// URL com Bounding Box de SP
		std::string url = "https://opensky-network.org/api/states/all?lamin=-24.0&lomin=-47.0&lamax=-23.3&lomax=-46.3";
		curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
		curl_easy_setopt(curl, CURLOPT_USERPWD, "seu_usuario:sua_senha"); // COLOQUE SEU LOGIN AQUI
		curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, WriteCallback);
		curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
		curl_easy_setopt(curl, CURLOPT_TIMEOUT, 5L);

		if (curl_easy_perform(curl) == CURLE_OK) {
			cJSON* json = cJSON_Parse(response.c_str());
			cJSON* states = cJSON_GetObjectItem(json, "states");

			if (cJSON_IsArray(states)) {
				planes.clear();
				int size = cJSON_GetArraySize(states);
				for (int i = 0; i < size; i++) {
					cJSON* s = cJSON_GetArrayItem(states, i);
					Plane p;
					p.callsign = cJSON_GetArrayItem(s, 1)->valuestring;
					p.lon = (float)cJSON_GetArrayItem(s, 5)->valuedouble;
					p.lat = (float)cJSON_GetArrayItem(s, 6)->valuedouble;
					p.heading = (float)cJSON_GetArrayItem(s, 10)->valuedouble;
					p.active = true;
					planes.push_back(p);
				}
			}
			cJSON_Delete(json);
		}
		curl_easy_cleanup(curl);
	}
}

int main() {
	InitWindow(800, 600, "O.I.A.L.A. - Radar São Paulo");
	
	// Carregar o Mapa (Certifique-se de que a imagem cobre exatamente o Bounding Box definido)
	Texture2D mapTexture = LoadTexture("O.I.A.L.A./resources/map.png"); 
	
	std::vector<Plane> airTraffic;
	double lastUpdate = 0;

	SetTargetFPS(60);

	while (!WindowShouldClose()) {
		// Atualiza a cada 10 segundos (Respeitando limites da API)
		if (GetTime() - lastUpdate > 10) {
			FetchData(airTraffic);
			lastUpdate = GetTime();
		}

		BeginDrawing();
			ClearBackground(BLACK);

			// 1. Desenha o Mapa de Fundo (redimensionado para a janela)
			DrawTexturePro(mapTexture, 
				{0, 0, (float)mapTexture.width, (float)mapTexture.height},
				{0, 0, 800, 600}, {0,0}, 0, WHITE);

			// 2. Desenha os Aviões
			for (const auto& p : airTraffic) {
				Vector2 pos = GeoToPixel(p.lat, p.lon, 800, 600);
				
				// Desenha Triângulo Rotacionado (O Avião)
				// Usamos DrawPoly para simplicidade ou DrawTriangle para o formato exato
				DrawPoly(pos, 3, 10, p.heading - 90, RED); 
				
				DrawText(p.callsign.c_str(), pos.x + 10, pos.y + 10, 10, RAYWHITE);
			}

			// 3. UI de Status
			DrawRectangle(0, 0, 180, 40, Fade(BLACK, 0.7f));
			DrawText(TextFormat("Aeronaves: %d", (int)airTraffic.size()), 10, 10, 15, GREEN);

		EndDrawing();
	}

	UnloadTexture(mapTexture);
	CloseWindow();
	return 0;
}