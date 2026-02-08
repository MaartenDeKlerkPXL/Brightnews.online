async function loadNews() {
    const response = await fetch('./data/news.json');
    const news = await response.json();
    const container = document.getElementById('news-container');

    news.forEach(item => {
        const article = document.createElement('div');
        article.innerHTML = `<h3>${item.translations.nl}</h3><a href="${item.link}">Lees meer</a>`;
        container.appendChild(article);
    });
}