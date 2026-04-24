# ==========================================
# O.I.A.L.A. - Makefile (Raylib + MISRA)
# ==========================================

NAME        = oiala
CC          = g++
# CFLAGS      = -Wall -Wextra -Werror -std=c++17 -I./inc
CFLAGS      = 
# Adicionando flags de depuração para facilitar no GDB
CFLAGS     += -g

# Bibliotecas (Flags fornecidas por você)
# Adicione o -lcurl no final da lista
LIBS = -lraylib -lGL -lm -lpthread -ldl -lrt -lX11 -lcurl

# Diretórios
SRC_DIR     = O.I.A.L.A.
INC_DIR     = inc
OBJ_DIR     = Obj

# Arquivos
CPP_SRC     = $(wildcard $(SRC_DIR)/*.cpp)
C_SRC       = $(wildcard $(SRC_DIR)/*.c)
OBJ         = $(CPP_SRC:$(SRC_DIR)/%.cpp=$(OBJ_DIR)/%.o) $(C_SRC:$(SRC_DIR)/%.c=$(OBJ_DIR)/%.o)

# Cores para o terminal (Estética de Engenharia)
GREEN       = \033[0;32m
CYAN        = \033[0;36m
RESET       = \033[0m

# ==========================================
# REGRAS PRINCIPAIS
# ==========================================

all: $(NAME)

# Linkagem do executável
$(NAME): $(OBJ)
	@echo "$(CYAN)Linkando $(NAME)...$(RESET)"
	@$(CC) $(OBJ) -o $(NAME) $(LIBS)
	@echo "$(GREEN)Projeto O.I.A.L.A. compilado com sucesso!$(RESET)"

# Compilação dos objetos
$(OBJ_DIR)/%.o: $(SRC_DIR)/%.cpp
	@mkdir -p $(OBJ_DIR)
	@echo "$(CYAN)Compilando $<...$(RESET)"
	@$(CC) $(CFLAGS) -c $< -o $@

$(OBJ_DIR)/%.o: $(SRC_DIR)/%.c
	@mkdir -p $(OBJ_DIR)
	@echo "$(CYAN)Compilando $<...$(RESET)"
	@$(CC) $(CFLAGS) -c $< -o $@

# Limpeza
clean:
	@rm -rf $(OBJ_DIR)
	@echo "$(CYAN)Objetos removidos.$(RESET)"

fclean: clean
	@rm -f $(NAME)
	@echo "$(CYAN)Executável removido.$(RESET)"

re: fclean all

# ==========================================
# FERRAMENTAS DE QUALIDADE (MISRA / LINT)
# ==========================================

# Comando para rodar o verificador de normas
check:
	@echo "$(GREEN)Rodando Verificação O.I.A.L.A. (Clang-Tidy)...$(RESET)"
	@clang-tidy $(SRC) -- $(CFLAGS)

# Formatação automática do código
format:
	@echo "$(GREEN)Formatando código...$(RESET)"
	@clang-format -i $(SRC) $(wildcard $(INC_DIR)/*.h)

.PHONY: all clean fclean re check format