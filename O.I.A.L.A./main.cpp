#include "raylib.h"

int main(void) {
    // 1. Inicialização da Janela
    const int screenWidth = 1250;
    const int screenHeight = 800;
    InitWindow(screenWidth, screenHeight, "O.I.A.L.A. - Visualizador de Mapa");

    // 2. Carregamento da Textura (O arquivo deve estar na pasta correta)
    // Raylib entende PNG/JPG automaticamente!
    Texture2D mapTexture = LoadTexture("/home/arthur/peojetos-pessoais/O.I.A.L.A/O.I.A.L.A./resources/map.png");

    SetTargetFPS(60); // Define 60 quadros por segundo

    // Loop Principal
    while (!WindowShouldClose()) {
        // --- Atualização de Lógica (Zoom, Posição) ---
        
        // --- Desenho ---
        BeginDrawing();
            ClearBackground(RAYWHITE);

            // Desenha a textura na posição (0, 0) com escala total
            DrawTexture(mapTexture, 0, 0, WHITE);

            // Exemplo de desenho de um "avião" por cima do mapa
            DrawTriangle((Vector2){400, 200}, (Vector2){390, 220}, (Vector2){410, 220}, RED);

        EndDrawing();
    }

    // 3. Descarregamento (Importante para evitar vazamento de memória - MISRA)
    UnloadTexture(mapTexture);
    CloseWindow();

    return 0;
}