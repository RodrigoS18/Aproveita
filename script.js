// ==========================================================
// Busca de alimentos do Aproveita
// Mostra uma lista suspensa (dropdown) abaixo do campo de busca
// com miniatura + nome dos até 5 produtos mais parecidos com o
// que foi digitado. O carrossel de "Ofertas em destaque" não é
// alterado pela busca.
// ==========================================================

(function () {
  "use strict";

  const form = document.getElementById("formBusca");
  const input = document.getElementById("inputBusca");
  const lista = document.getElementById("listaOfertas");
  const dropdown = document.getElementById("resultadosBusca");
  const backdrop = document.getElementById("buscaBackdrop");

  // Se a página não tiver esses elementos, não faz nada (evita erro no console)
  if (!form || !input || !lista || !dropdown) return;

  const cards = Array.from(lista.querySelectorAll(".card-oferta"));
  const MAX_RESULTADOS = 5;
  const LIMIAR_MINIMO = 60; // pontuação mínima (0-100) pra considerar "parecido o suficiente"

  /**
   * Remove acentos e deixa tudo minúsculo, para comparar
   * "Pães" com "paes", "AÇAÍ" com "acai", etc.
   */
  function normalizar(texto) {
    return texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  }

  /**
   * Distância de Levenshtein: quantas edições (trocar, adicionar
   * ou remover uma letra) são necessárias para transformar uma
   * palavra na outra. Quanto menor, mais parecidas são.
   */
  function distanciaLevenshtein(a, b) {
    const linhas = a.length + 1;
    const colunas = b.length + 1;
    const matriz = Array.from({ length: linhas }, () => new Array(colunas).fill(0));

    for (let i = 0; i < linhas; i++) matriz[i][0] = i;
    for (let j = 0; j < colunas; j++) matriz[0][j] = j;

    for (let i = 1; i < linhas; i++) {
      for (let j = 1; j < colunas; j++) {
        const custo = a[i - 1] === b[j - 1] ? 0 : 1;
        matriz[i][j] = Math.min(
          matriz[i - 1][j] + 1,
          matriz[i][j - 1] + 1,
          matriz[i - 1][j - 1] + custo
        );
      }
    }
    return matriz[linhas - 1][colunas - 1];
  }

  /**
   * Calcula o quão "próximo" um nome de produto está do termo
   * buscado. Quanto MAIOR a pontuação (0 a 1000), melhor o resultado.
   */
  function calcularPontuacao(nomeProduto, termoBuscado) {
    const nome = normalizar(nomeProduto);
    const termo = normalizar(termoBuscado);

    if (!termo) return 0;

    if (nome.startsWith(termo)) return 1000 - nome.length;
    if (nome.includes(termo)) return 500 - nome.length;

    // Ignora palavras muito curtas (ex.: "do", "da") para elas não
    // "casarem" por acaso com termos de poucas letras.
    const palavras = nome.split(/\s+/).filter((p) => p.length >= 3);
    let melhorSimilaridade = 0;

    palavras.forEach((palavra) => {
      const distancia = distanciaLevenshtein(termo, palavra);
      const tamanhoMaior = Math.max(termo.length, palavra.length);
      const similaridade = 1 - distancia / tamanhoMaior;
      if (similaridade > melhorSimilaridade) melhorSimilaridade = similaridade;
    });

    return melhorSimilaridade * 100;
  }

  /**
   * Monta a lista de até MAX_RESULTADOS cards mais parecidos
   * com o termo buscado, já ordenados do melhor pro pior.
   */
  function buscarMaisParecidos(termo) {
    return cards
      .map((card) => ({
        card,
        pontuacao: calcularPontuacao(card.dataset.nome || "", termo),
      }))
      .filter((resultado) => resultado.pontuacao >= LIMIAR_MINIMO)
      .sort((a, b) => b.pontuacao - a.pontuacao)
      .slice(0, MAX_RESULTADOS);
  }

  /** Esconde e esvazia a lista suspensa */
  function fecharDropdown() {
    dropdown.classList.add("d-none");
    dropdown.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
  }

  /** Preenche e mostra a lista suspensa com os resultados dados. */
  function mostrarDropdown(resultados) {
    dropdown.innerHTML = "";

    if (resultados.length === 0) {
      const item = document.createElement("li");
      item.className = "px-3 py-2 text-secondary fs-7";
      item.textContent = "Nenhum alimento encontrado com esse nome.";
      dropdown.appendChild(item);
    } else {
      resultados.forEach((resultado) => {
        const { card } = resultado;
        const nome = card.dataset.nome || "";
        const imagem = card.dataset.imagem || "";

        const item = document.createElement("li");
        item.className = "resultado-busca-item d-flex align-items-center gap-2 px-3 py-2";
        item.setAttribute("role", "option");
        item.tabIndex = 0;

        item.innerHTML = `
          <img src="${imagem}" alt="" class="resultado-busca-img rounded-3 object-fit-cover flex-shrink-0">
          <span class="fs-7 text-dark text-truncate">${nome}</span>
        `;

        // Ao escolher um resultado: fecha o dropdown, leva o campo
        // de busca para o nome escolhido e rola a página até o card
        // correspondente no carrossel, destacando-o por um instante.
        const escolher = () => {
          input.value = nome;
          fecharDropdown();
          card.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
          card.classList.add("card-destacado");
          setTimeout(() => card.classList.remove("card-destacado"), 1500);
        };

        item.addEventListener("click", escolher);
        item.addEventListener("keydown", (evento) => {
          if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            escolher();
          }
        });

        dropdown.appendChild(item);
      });
    }

    dropdown.classList.remove("d-none");
    input.setAttribute("aria-expanded", "true");
    if (backdrop) backdrop.classList.add("ativo");
  }

  function atualizarBusca() {
    const termo = input.value.trim();

    if (!termo) {
      fecharDropdown();
      return;
    }

    mostrarDropdown(buscarMaisParecidos(termo));
  }

  // Abre/atualiza a lista enquanto a pessoa digita
  input.addEventListener("input", atualizarBusca);

  // Reabre a lista se o campo já tiver texto e ganhar foco de novo
  input.addEventListener("focus", () => {
    if (input.value.trim()) atualizarBusca();
  });

  // Enviar o formulário (Enter ou clique na lupa) mostra a lista também,
  // sem recarregar a página
  form.addEventListener("submit", (evento) => {
    evento.preventDefault();
    atualizarBusca();
  });

  // Fecha a lista ao clicar fora dela e do campo de busca
  document.addEventListener("click", (evento) => {
    if (!form.contains(evento.target) && !dropdown.contains(evento.target)) {
      fecharDropdown();
    }
  });

  // Fecha a lista ao apertar Esc
  input.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") fecharDropdown();
  });
})();