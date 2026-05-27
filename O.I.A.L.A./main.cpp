#include "include/include.hpp"

// --- CONVERSÃO GEOGRÁFICA PARA PIXEL ---
Vector2 GeoToPixel(float lat, float lon, int width, int height) {
	float x = (lon - MAP_MIN_LON) / (MAP_MAX_LON - MAP_MIN_LON) * width;
	// Em telas, o Y cresce para baixo, por isso invertemos a conta da latitude
	float y = (MAP_MAX_LAT - lat) / (MAP_MAX_LAT - MAP_MIN_LAT) * height;
	return { x, y };
}

// --- BUSCA DE DADOS NA API ---

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