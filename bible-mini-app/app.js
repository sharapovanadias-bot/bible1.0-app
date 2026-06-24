const tg = window.Telegram.WebApp;
tg.expand();

// Application State
const state = {
    language: 'ru', // 'ru' or 'en'
    currentTab: 'bible',
    view: 'books',
    currentBook: null,
    currentChapter: null,
    translations: {
        ru: {
            title: 'Библия для всех',
            bible: 'Библия',
            search: 'Поиск',
            gallery: 'Рисунки',
            info: 'Инфо',
            favorites: 'Избранное',
            searchPlaceholder: 'Поиск по стихам...',
            back: 'Назад',
            commentary: 'Толкование',
            chapters: 'Главы',
            loading: 'Загрузка...',
            noResults: 'Ничего не найдено',
            minChars: 'Введите минимум 3 символа...',
            verse: 'Стих',
            commentaryText: 'Здесь будет подробное толкование на выбранный стих.',
            source: 'Источник: Толковая Библия Лопухина',
            addToFav: 'В избранное',
            removeFromFav: 'Удалить из избранного',
            noFavorites: 'У вас пока нет избранных стихов'
        },
        en: {
            title: 'Bible for Everyone',
            bible: 'Bible',
            search: 'Search',
            gallery: 'Gallery',
            info: 'Info',
            favorites: 'Favorites',
            searchPlaceholder: 'Search verses...',
            back: 'Back',
            commentary: 'Commentary',
            chapters: 'Chapters',
            loading: 'Loading...',
            noResults: 'No results found',
            minChars: 'Enter at least 3 characters...',
            verse: 'Verse',
            commentaryText: 'Detailed commentary for the selected verse will appear here.',
            source: 'Source: Matthew Henry Commentary',
            addToFav: 'Add to Favorites',
            removeFromFav: 'Remove from Favorites',
            noFavorites: 'You have no favorite verses yet'
        }
    },
    books: {
        ru: [
            { id: 'gen', name: 'Бытие', chapters: 50 },
            { id: 'psa', name: 'Псалтирь', chapters: 150 },
            { id: 'mat', name: 'От Матфея', chapters: 28 },
            { id: 'joh', name: 'От Иоанна', chapters: 21 },
            { id: 'rev', name: 'Откровение', chapters: 22 }
        ],
        en: [
            { id: 'gen', name: 'Genesis', chapters: 50 },
            { id: 'psa', name: 'Psalms', chapters: 150 },
            { id: 'mat', name: 'Matthew', chapters: 28 },
            { id: 'joh', name: 'John', chapters: 21 },
            { id: 'rev', name: 'Revelation', chapters: 22 }
        ]
    }
};

const views = {
    books: document.getElementById('view-books'),
    chapters: document.getElementById('view-chapters'),
    reader: document.getElementById('view-reader'),
    search: document.getElementById('view-search'),
    gallery: document.getElementById('view-gallery'),
    info: document.getElementById('view-info'),
    favorites: document.getElementById('view-favorites')
};

let favorites = JSON.parse(localStorage.getItem('bible_favorites') || '[]');

function init() {
    const savedLang = localStorage.getItem('bible_app_lang');
    if (savedLang) state.language = savedLang;
    
    updateUILanguage();
    backButton.addEventListener('click', goBack);
    
    document.body.style.backgroundColor = tg.backgroundColor;
    document.body.style.color = tg.textColor;
}

function updateUILanguage() {
    const t = state.translations[state.language];
    document.querySelector('#nav-bible span').innerText = t.bible;
    document.querySelector('#nav-search span').innerText = t.search;
    document.querySelector('#nav-gallery span').innerText = t.gallery;
    document.querySelector('#nav-info span').innerText = t.info;
    document.querySelector('#nav-favorites span').innerText = t.favorites;
    document.getElementById('lang-label').innerText = state.language.toUpperCase();
    document.getElementById('info-title').innerText = t.title;
    document.getElementById('search-input').placeholder = t.searchPlaceholder;
    
    if (state.currentTab === 'bible') {
        if (state.view === 'books') headerTitle.innerText = t.bible;
        else if (state.currentBook) headerTitle.innerText = state.currentBook.name;
    } else {
        headerTitle.innerText = t[state.currentTab] || t.bible;
    }
    renderBooks();
}

function toggleFavorite(bookId, bookName, ch, v, text) {
    const favIndex = favorites.findIndex(f => f.bookId === bookId && f.ch === ch && f.v === v && f.lang === state.language);
    if (favIndex > -1) {
        favorites.splice(favIndex, 1);
    } else {
        favorites.push({ bookId, bookName, ch, v, text, lang: state.language });
    }
    localStorage.setItem('bible_favorites', JSON.stringify(favorites));
    
    // Refresh current view if needed
    if (state.view === 'reader') selectChapter(state.currentChapter);
    if (state.currentTab === 'favorites') renderFavorites();
}

function renderFavorites() {
    const t = state.translations[state.language];
    const favList = favorites.filter(f => f.lang === state.language);
    
    if (favList.length === 0) {
        views.favorites.innerHTML = `<p class="text-hint text-center py-10">${t.noFavorites}</p>`;
        return;
    }

    views.favorites.innerHTML = favList.map(fav => `
        <div class="p-4 bg-secondary rounded-xl relative group">
            <div class="flex justify-between items-start mb-2">
                <span class="text-xs font-bold text-blue-500">${fav.bookName} ${fav.ch}:${fav.v}</span>
                <button onclick="toggleFavorite('${fav.bookId}', '${fav.bookName}', ${fav.ch}, ${fav.v}, '')" class="text-red-500">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
            <p class="text-sm italic" onclick="goToVerseById('${fav.bookId}', ${fav.ch}, ${fav.v})">"${fav.text}"</p>
        </div>
    `).join('');
}

function toggleLanguage() {
    state.language = state.language === 'ru' ? 'en' : 'ru';
    localStorage.setItem('bible_app_lang', state.language);
    
    // Update current book name if one is selected
    if (state.currentBook) {
        const bookId = state.currentBook.id;
        state.currentBook = state.books[state.language].find(b => b.id === bookId);
    }
    
    updateUILanguage();
    if (state.view === 'chapters') selectBook(state.currentBook);
    if (state.view === 'reader') selectChapter(state.currentChapter);
}

function switchTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    const navEl = document.getElementById(`nav-${tab}`);
    if (navEl) navEl.classList.add('active');
    
    Object.values(views).forEach(v => v.classList.add('hidden'));
    
    const t = state.translations[state.language];
    if (tab === 'bible') {
        showView(state.view);
    } else if (tab === 'favorites') {
        views.favorites.classList.remove('hidden');
        headerTitle.innerText = t.favorites;
        backButton.classList.add('hidden');
        renderFavorites();
    } else {
        views[tab].classList.remove('hidden');
        headerTitle.innerText = t[tab] || t.bible;
        backButton.classList.add('hidden');
        if (tab === 'gallery') renderGallery();
    }
}

function showView(viewName) {
    state.view = viewName;
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
    if (viewName === 'books') {
        backButton.classList.add('hidden');
        headerTitle.innerText = state.translations[state.language].bible;
    } else {
        backButton.classList.remove('hidden');
    }
}

function renderBooks() {
    views.books.innerHTML = '';
    state.books[state.language].forEach(book => {
        const div = document.createElement('div');
        div.className = 'p-4 bg-secondary rounded-xl mb-2 flex justify-between items-center active:opacity-70 cursor-pointer';
        div.innerHTML = `<span class="font-medium">${book.name}</span><i class="bi bi-chevron-right text-hint"></i>`;
        div.onclick = () => selectBook(book);
        views.books.appendChild(div);
    });
}

function selectBook(book) {
    state.currentBook = book;
    headerTitle.innerText = book.name;
    views.chapters.innerHTML = '';
    for (let i = 1; i <= book.chapters; i++) {
        const btn = document.createElement('button');
        btn.className = 'aspect-square flex items-center justify-center bg-secondary rounded-lg font-bold';
        btn.innerText = i;
        btn.onclick = () => selectChapter(i);
        views.chapters.appendChild(btn);
    }
    showView('chapters');
}

// Data Cache to store loaded books
const bibleCache = {};

async function selectChapter(chapterNum) {
    state.currentChapter = chapterNum;
    const t = state.translations[state.language];
    headerTitle.innerText = `${state.currentBook.name}, ${chapterNum}`;
    
    views.reader.innerHTML = `<div class="flex justify-center p-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>`;
    showView('reader');
    
    try {
        const bookData = await loadBookData(state.currentBook.id, state.language);
        const chapter = bookData.chapters.find(c => c.chapter === chapterNum);
        
        if (chapter) {
            let html = '';
            chapter.verses.forEach((text, index) => {
                const verseNum = index + 1;
                const isFav = favorites.some(f => f.bookId === state.currentBook.id && f.ch === chapterNum && f.v === verseNum && f.lang === state.language);
                
                html += `
                    <div class="mb-4 verse p-3 rounded-xl bg-secondary bg-opacity-30 relative transition-all">
                        <div class="flex justify-between items-start mb-1">
                            <span class="verse-number">${verseNum}</span>
                            <div class="flex gap-3">
                                <button onclick="toggleFavorite('${state.currentBook.id}', '${state.currentBook.name}', ${chapterNum}, ${verseNum}, '${text.replace(/'/g, "\\'")}')" class="${isFav ? 'text-red-500' : 'text-hint'}">
                                    <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
                                </button>
                                <button onclick="showCommentary(${verseNum})" class="text-blue-500">
                                    <i class="bi bi-chat-text"></i>
                                </button>
                            </div>
                        </div>
                        <p class="leading-relaxed">${text}</p>
                    </div>`;
            });
            views.reader.innerHTML = html;
            views.reader.parentElement.scrollTop = 0;
        } else {
            views.reader.innerHTML = `<p class="p-4 text-center opacity-50">${t.noResults} (Chapter data missing)</p>`;
        }
    } catch (error) {
        console.error("Load error:", error);
        views.reader.innerHTML = `<p class="p-4 text-center text-red-500">Error loading text. This is a prototype - only 'Genesis' and 'John' are available for now.</p>`;
    }
}

async function loadBookData(bookId, lang) {
    const cacheKey = `${lang}_${bookId}`;
    if (bibleCache[cacheKey]) return bibleCache[cacheKey];
    
    try {
        const response = await fetch(`data/${lang}/${bookId}.json`);
        if (!response.ok) throw new Error('File not found');
        const data = await response.json();
        bibleCache[cacheKey] = data;
        return data;
    } catch (e) {
        // Fallback for missing files in prototype
        throw e;
    }
}

function goBack() {
    if (state.view === 'reader') showView('chapters');
    else if (state.view === 'chapters') showView('books');
}

const commCache = {};

async function loadCommentaryData(bookId, chapterNum, lang) {
    const cacheKey = `${lang}_${bookId}_${chapterNum}`;
    if (commCache[cacheKey]) return commCache[cacheKey];
    
    try {
        const response = await fetch(`data/${lang}/comm/${bookId}_${chapterNum}.json`);
        if (!response.ok) return null;
        const data = await response.json();
        commCache[cacheKey] = data;
        return data;
    } catch (e) {
        return null;
    }
}

async function showCommentary(verseNum) {
    const t = state.translations[state.language];
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `<div class="flex justify-center p-6"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>`;
    modal.classList.remove('hidden');
    setTimeout(() => content.classList.remove('translate-y-full'), 10);

    const commData = await loadCommentaryData(state.currentBook.id, state.currentChapter, state.language);
    const verseCommentary = commData ? commData[verseNum] : null;

    content.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <h3 class="text-xl font-bold">${t.commentary}: ${state.currentBook.name} ${state.currentChapter}:${verseNum}</h3>
            <button onclick="closeModal()" class="text-2xl">&times;</button>
        </div>
        <div class="space-y-4">
            <p class="text-md leading-relaxed">
                ${verseCommentary || t.commentaryText}
            </p>
            <div class="p-3 bg-secondary rounded-lg italic text-sm text-blue-500">
                ${state.language === 'ru' ? 'Источник: Толковая Библия Лопухина' : 'Source: Concise Bible Commentary'}
            </div>
        </div>
    `;
}

function closeModal() {
    const content = document.getElementById('modal-content');
    content.classList.add('translate-y-full');
    setTimeout(() => document.getElementById('modal-overlay').classList.add('hidden'), 300);
}

function renderGallery() {
    const t = state.translations[state.language];
    const items = state.language === 'ru' 
        ? [
            { url: 'public/assets/creation.jpg', title: 'Сотворение мира' },
            { url: 'public/assets/noah_ark.jpg', title: 'Ноев Ковчег' },
            { url: 'public/assets/david_harp.jpg', title: 'Царь Давид' },
            { url: 'public/assets/sermon_on_the_mount.jpg', title: 'Нагорная проповедь' },
            { url: 'public/assets/revelation.jpg', title: 'Новый Иерусалим' }
          ]
        : [
            { url: 'public/assets/creation.jpg', title: 'Creation' },
            { url: 'public/assets/noah_ark.jpg', title: 'Noah\'s Ark' },
            { url: 'public/assets/david_harp.jpg', title: 'King David' },
            { url: 'public/assets/sermon_on_the_mount.jpg', title: 'Sermon on the Mount' },
            { url: 'public/assets/revelation.jpg', title: 'New Jerusalem' }
          ];
    
    views.gallery.innerHTML = items.map(img => `
        <div class="rounded-lg overflow-hidden shadow-sm bg-secondary">
            <img src="${img.url}" class="w-full h-40 object-cover" onerror="this.src='https://via.placeholder.com/400x300'">
            <p class="p-2 text-xs font-medium text-center">${img.title}</p>
        </div>
    `).join('');
}

document.getElementById('search-input').addEventListener('input', async (e) => {
    const query = e.target.value.toLowerCase();
    const t = state.translations[state.language];
    const resultsContainer = document.getElementById('search-results');
    
    if (query.length < 3) {
        resultsContainer.innerHTML = `<p class="text-hint text-center">${t.minChars}</p>`;
        return;
    }
    
    resultsContainer.innerHTML = `<div class="flex justify-center p-4"><div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div></div>`;
    
    // In a real app, this would be a full-text search index
    // For this prototype, we'll search through the already cached books
    const results = [];
    const booksToSearch = ['gen', 'joh', 'mat', 'psa']; // Sample books we have data for
    
    for (const bookId of booksToSearch) {
        try {
            const bookData = await loadBookData(bookId, state.language);
            const bookInfo = state.books[state.language].find(b => b.id === bookId);
            
            bookData.chapters.forEach(ch => {
                ch.verses.forEach((vText, vIdx) => {
                    if (vText.toLowerCase().includes(query)) {
                        results.push({
                            book: bookInfo.name,
                            bookId: bookId,
                            ch: ch.chapter,
                            v: vIdx + 1,
                            text: vText
                        });
                    }
                });
            });
        } catch (e) { /* ignore missing books */ }
    }
    
    resultsContainer.innerHTML = results.length ? results.map(res => `
        <div class="p-3 bg-secondary rounded-lg active:opacity-70" onclick="goToVerseById('${res.bookId}', ${res.ch}, ${res.v})">
            <div class="text-xs font-bold text-blue-500 mb-1">${res.book} ${res.ch}:${res.v}</div>
            <div class="text-sm">${res.text}</div>
        </div>
    `).join('') : `<p class="text-hint text-center">${t.noResults}</p>`;
});

function goToVerseById(bookId, ch, v) {
    const book = state.books[state.language].find(b => b.id === bookId);
    if (book) {
        selectBook(book);
        selectChapter(ch);
        switchTab('bible');
    }
}

init();
