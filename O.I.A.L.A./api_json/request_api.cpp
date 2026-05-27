#include "../include/include.hpp"


// --- FUNÇÃO DE AUXÍLIO PARA CURL ---
size_t WriteCallback(void* contents, size_t size, size_t nmemb, std::string* s) {
	size_t newLength = size * nmemb;
	s->append((char*)contents, newLength);
	return newLength;
}

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
