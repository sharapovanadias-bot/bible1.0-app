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

const headerTitle = document.getElementById('header-title');
const backButton = document.getElementById('back-button');
let favorites = JSON.parse(localStorage.getItem('bible_favorites') || '[]');

const bibleCache = {};
const commCache = {};

function init() {
    const savedLang = localStorage.getItem('bible_app_lang');
    if (savedLang) state.language = savedLang;
    
    updateUILanguage();
    backButton.addEventListener('click', goBack);
    
    document.body.style.backgroundColor = tg.backgroundColor || '#ffffff';
    document.body.style.color = tg.textColor || '#000000';
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

function toggleLanguage() {
    state.language = state.language === 'ru' ? 'en' : 'ru';
    localStorage.setItem('bible_app_lang', state.language);
    if (state.currentBook) {
        state.currentBook = state.books[state.language].find(b => b.id === state.currentBook.id);
    }
    updateUILanguage();
    if (state.view === 'chapters') selectBook(state.currentBook);
    if (state.view === 'reader') selectChapter(state.currentChapter);
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

async function selectChapter(chapterNum) {
    state.currentChapter = chapterNum;
    headerTitle.innerText = `${state.currentBook.name}, ${chapterNum}`;
    views.reader.innerHTML = `<div class="flex justify-center p-10"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>`;
    showView('reader');
    try {
        const bookData = await loadBookData(state.currentBook.id, state.language);
        const chapter = bookData.chapters.find(c => c.chapter === chapterNum);
        if (chapter) {
            let html = '';
            chapter.verses.forEach((text, index) => {
                const vNum = index + 1;
                const isFav = favorites.some(f => f.bookId === state.currentBook.id && f.ch === chapterNum && f.v === vNum && f.lang === state.language);
                html += `
                <div class="mb-4 verse p-3 rounded-xl bg-secondary bg-opacity-30 relative transition-all">
                    <div class="flex justify-between items-start mb-1">
                        <span class="verse-number">${vNum}</span>
                        <div class="flex gap-3">
                            <button onclick="toggleFavorite('${state.currentBook.id}', '${state.currentBook.name}', ${chapterNum}, ${vNum}, '${text.replace(/'/g, "\\'")}')" class="${isFav ? 'text-red-500' : 'text-hint'}">
                                <i class="bi ${isFav ? 'bi-heart-fill' : 'bi-heart'}"></i>
                            </button>
                            <button onclick="showCommentary(${vNum})" class="text-blue-500">
                                <i class="bi bi-chat-text"></i>
                            </button>
                        </div>
                    </div>
                    <p class="leading-relaxed">${text}</p>
                </div>`;
            });
            views.reader.innerHTML = html;
        }
    } catch (e) { views.reader.innerHTML = '<p class="p-4 text-center">Ошибка загрузки текста.</p>'; }
}

async function loadBookData(bookId, lang) {
    const key = `${lang}_${bookId}`;
    if (bibleCache[key]) return bibleCache[key];
    const resp = await fetch(`data/${lang}/${bookId}.json`);
    const data = await resp.json();
    bibleCache[key] = data;
    return data;
}

function showView(viewName) {
    state.view = viewName;
    Object.values(views).forEach(v => v.classList.add('hidden'));
    views[viewName].classList.remove('hidden');
    if (viewName === 'books') {
        backButton.classList.add('hidden');
    } else {
        backButton.classList.remove('hidden');
    }
}

function goBack() {
    if (state.view === 'reader') showView('chapters');
    else if (state.view === 'chapters') showView('books');
}

function switchTab(tab) {
    state.currentTab = tab;
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    document.getElementById(`nav-${tab}`).classList.add('active');
    Object.values(views).forEach(v => v.classList.add('hidden'));
    if (tab === 'bible') showView(state.view);
    else {
        views[tab].classList.remove('hidden');
        headerTitle.innerText = state.translations[state.language][tab] || '';
        backButton.classList.add('hidden');
        if (tab === 'gallery') renderGallery();
        if (tab === 'favorites') renderFavorites();
    }
}

async function showCommentary(verseNum) {
    const t = state.translations[state.language];
    const modal = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    modal.classList.remove('hidden');
    setTimeout(() => content.classList.remove('translate-y-full'), 10);
    content.innerHTML = `<p>${t.loading}</p>`;
    
    try {
        const resp = await fetch(`data/${state.language}/comm/${state.currentBook.id}_${state.currentChapter}.json`);
        const data = await resp.json();
        const comm = data[verseNum] || t.commentaryText;
        content.innerHTML = `<div class="flex justify-between mb-4"><h3 class="font-bold">${t.commentary} ${verseNum}</h3><button onclick="closeModal()">×</button></div><p>${comm}</p>`;
    } catch(e) {
        content.innerHTML = `<div class="flex justify-between mb-4"><h3 class="font-bold">${t.commentary} ${verseNum}</h3><button onclick="closeModal()">×</button></div><p>${t.commentaryText}</p>`;
    }
}

function closeModal() {
    document.getElementById('modal-content').classList.add('translate-y-full');
    setTimeout(() => document.getElementById('modal-overlay').classList.add('hidden'), 300);
}

function renderGallery() {
    const items = state.language === 'ru' 
        ? [{url:'public/assets/creation.jpg',title:'Сотворение'},{url:'public/assets/noah_ark.jpg',title:'Ковчег'},{url:'public/assets/david_harp.jpg',title:'Давид'},{url:'public/assets/sermon_on_the_mount.jpg',title:'Проповедь'},{url:'public/assets/revelation.jpg',title:'Иерусалим'}]
        : [{url:'public/assets/creation.jpg',title:'Creation'},{url:'public/assets/noah_ark.jpg',title:'Ark'},{url:'public/assets/david_harp.jpg',title:'David'},{url:'public/assets/sermon_on_the_mount.jpg',title:'Sermon'},{url:'public/assets/revelation.jpg',title:'Jerusalem'}];
    views.gallery.innerHTML = items.map(img => `<div class="bg-secondary rounded-lg overflow-hidden"><img src="${img.url}" class="w-full h-32 object-cover"><p class="p-2 text-center text-xs">${img.title}</p></div>`).join('');
}

function toggleFavorite(bookId, bookName, ch, v, text) {
    const idx = favorites.findIndex(f => f.bookId === bookId && f.ch === ch && f.v === v && f.lang === state.language);
    if (idx > -1) favorites.splice(idx, 1);
    else favorites.push({ bookId, bookName, ch, v, text, lang: state.language });
    localStorage.setItem('bible_favorites', JSON.stringify(favorites));
    if (state.view === 'reader') selectChapter(state.currentChapter);
}

function renderFavorites() {
    const favList = favorites.filter(f => f.lang === state.language);
    views.favorites.innerHTML = favList.length ? favList.map(f => `<div class="p-3 bg-secondary rounded-lg mb-2"><p class="text-xs font-bold text-blue-500">${f.bookName} ${f.ch}:${f.v}</p><p class="text-sm italic">${f.text}</p></div>`).join('') : '<p class="text-center">Пусто</p>';
}

init();
