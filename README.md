# Portfólio · Gabriel Leonardelli

Site estático (HTML + CSS, sem dependências) para o GitHub Pages.

## Publicar

1. Crie um repositório público chamado **`GabrielLeo12.github.io`**.
2. Envie `index.html` e a pasta `img/` para a raiz do repositório.
3. Em *Settings → Pages*, escolha *Deploy from a branch*, branch `main`, pasta `/ (root)`.
4. Em alguns minutos o site fica em `https://gabrielleo12.github.io`.

## Domínio próprio (ex.: gabrielleonardelli.com.br)

1. Registre o domínio no registro.br.
2. No GitHub, em *Settings → Pages → Custom domain*, digite o domínio e salve.
3. No registro.br, em *DNS → Editar zona*, crie:
   - 4 registros **A** para `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - 1 registro **CNAME** para `www` → `gabrielleo12.github.io`
4. Quando o DNS propagar (de minutos a algumas horas), marque **Enforce HTTPS**.

## Adicionar um projeto

Copie um bloco `<article class="proj">` em `index.html`, troque textos, números e links, e coloque a imagem em `img/`.
A cor do projeto é definida por `style="--c:var(--blue)"` (`--blue`, `--orange` ou `--green`).
