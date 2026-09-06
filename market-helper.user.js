// ==UserScript==
// @name         MARKET ENHANCER
// @namespace    lzt.market.rare-skins
// @version      1.2.3
// @description  rare shit 
// @match        https://lzt.market/*
// @match        https://lolz.team/*
// @match        https://lolz.live/*
// @match        https://zelenka.guru/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_addValueChangeListener
// @connect      prod-api.lzt.market
// @connect      api.lzt.market
// @connect      lzt.market
// @connect      market.csgo.com
// @connect      funpay.com
// @run-at       document-start
// @downloadURL  https://raw.githubusercontent.com/m6m7m8/marketENHANCER/main/market-helper.user.js
// @updateURL    https://raw.githubusercontent.com/m6m7m8/marketENHANCER/main/market-helper.user.js
// ==/UserScript==

(function () {
    'use strict';

    function getSharedStorageBridge() {
        const bridge = typeof window !== 'undefined' && window.__MARKET_ENHANCER_DEV__ ? window.__MARKET_ENHANCER_DEV__ : null;
        return {
            getValue: (typeof GM_getValue === 'function') ? GM_getValue : (bridge && typeof bridge.GM_getValue === 'function' ? bridge.GM_getValue : null),
            setValue: (typeof GM_setValue === 'function') ? GM_setValue : (bridge && typeof bridge.GM_setValue === 'function' ? bridge.GM_setValue : null),
            deleteValue: (typeof GM_deleteValue === 'function') ? GM_deleteValue : (bridge && typeof bridge.GM_deleteValue === 'function' ? bridge.GM_deleteValue : null),
            addValueChangeListener: (typeof GM_addValueChangeListener === 'function') ? GM_addValueChangeListener : (bridge && typeof bridge.GM_addValueChangeListener === 'function' ? bridge.GM_addValueChangeListener : null)
        };
    }

    function storageGet(key) {
        try {
            const sharedStorage = getSharedStorageBridge();
            if (sharedStorage.getValue) {
                const shared = sharedStorage.getValue(key, null);
                if (shared !== null && shared !== undefined) return shared;
                const local = localStorage.getItem(key);
                if (local !== null && local !== undefined && sharedStorage.setValue) sharedStorage.setValue(key, local);
                return local;
            }
        } catch (e) {}
        try { return localStorage.getItem(key); } catch (e) { return null; }
    }

    function storageSet(key, value) {
        try {
            const sharedStorage = getSharedStorageBridge();
            if (sharedStorage.setValue) sharedStorage.setValue(key, value);
        } catch (e) {}
        try { localStorage.setItem(key, value); } catch (e) {}
    }

    function storageRemove(key) {
        try {
            const sharedStorage = getSharedStorageBridge();
            if (sharedStorage.deleteValue) sharedStorage.deleteValue(key);
        } catch (e) {}
        try { localStorage.removeItem(key); } catch (e) {}
    }

    function storageWatch(key, callback) {
        try {
            const sharedStorage = getSharedStorageBridge();
            if (sharedStorage.addValueChangeListener) {
                return sharedStorage.addValueChangeListener(key, (name, oldVal, newVal, remote) => { if (remote) callIfFn2(callback, newVal); });
            }
        } catch (e) {}
        const handler = (e) => { if (e && e.key === key) callIfFn2(callback, e.newValue); };
        try { window.addEventListener('storage', handler); } catch (e) {}
        return () => { try { window.removeEventListener('storage', handler); } catch (e) {} };
    }
    const callIfFn2 = (fn, arg) => { try { if (typeof fn === 'function') fn(arg); } catch (e) {} };

    function parseStoredJson(raw, fallback) {
        try {
            return raw ? JSON.parse(raw) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    const loadStoredJson = (key, fallback) => parseStoredJson(storageGet(key), fallback);

    const saveStoredJson = (key, value) => { try { storageSet(key, JSON.stringify(value)); } catch (e) {} };

    function loadStoredState(key, fallback, normalize) {
        const value = loadStoredJson(key, fallback);
        return typeof normalize === 'function' ? normalize(value) : value;
    }

    const saveStoredState = (key, value, normalize) => saveStoredJson(key, typeof normalize === 'function' ? normalize(value) : value);

    const loadStoredArray = (key) => loadStoredState(key, [], value => Array.isArray(value) ? value : []);

    function saveStoredArray(key, arr, maxItems) {
        const next = Array.isArray(arr) ? arr : [];
        saveStoredJson(key, maxItems ? next.slice(0, maxItems) : next);
    }

    const loadStoredObject = (key) => loadStoredState(key, null, value => isPlainObject(value) ? value : {});

    const loadNormalizedStoredJson = (key, defaults, normalize) => loadStoredState(key, cloneObject(defaults), normalize);

    const saveNormalizedStoredJson = (key, value, normalize) => saveStoredState(key, value, normalize);

    function updateStoredObject(key, mutator) {
        const next = loadStoredObject(key);
        if (mutator(next) === false) return next;
        saveStoredJson(key, next);
        return next;
    }

    function prependStoredEntry(load, save, entry, onChange) {
        const items = load();
        items.unshift(entry);
        save(items);
        callIfFn(onChange);
        return entry;
    }

    function importLztLocalStorageOnce() {
        const sharedStorage = getSharedStorageBridge();
        if (location.hostname !== 'lzt.market' || !sharedStorage.getValue || !sharedStorage.setValue) return;
        const marker = 'rareSharedStorageImportedFromLzt_v2';
        try {
            if (sharedStorage.getValue(marker, '') === '1') return;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key || !key.startsWith('rare')) continue;
                const value = localStorage.getItem(key);
                if (value !== null && value !== undefined) {
                    sharedStorage.setValue(key, value);
                }
            }
            sharedStorage.setValue(marker, '1');
        } catch (e) {}
    }

    const cloneObject = (value) => Object.assign({}, value);

    function getErrorMessage(error, fallback) {
        const message = error && error.message != null ? error.message : error;
        const text = String(message == null ? '' : message).trim();
        return text || String(fallback || 'Ошибка');
    }

    function getErrorDetails(error) {
        const details = error && error.details != null ? error.details : '';
        return String(details == null ? '' : details).trim();
    }

    function trimErrorText(text, maxLen) {
        const clean = String(text == null ? '' : text).replace(/\s+/g, ' ').trim();
        return maxLen && clean.length > maxLen ? clean.slice(0, maxLen) : clean;
    }

    function createError(message, details, extra) {
        const error = new Error(getErrorMessage(message, 'Ошибка'));
        const cleanDetails = trimErrorText(details, 400);
        if (cleanDetails) error.details = cleanDetails;
        if (extra !== undefined) error.extra = extra;
        return error;
    }

    const throwError = (message, details, extra) => { throw createError(message, details, extra); };

    function formatErrorText(error, fallback) {
        const message = getErrorMessage(error, fallback);
        const details = getErrorDetails(error);
        return details && details !== message ? (message + ': ' + details) : message;
    }

    const showUiError = (error, fallback, key) => showErrorToast(formatErrorText(error, fallback), key);

    function logScriptError(scope, error, extra) {
        console.error('[MARKET ENHANCER] ' + scope, {
            message: getErrorMessage(error, 'Ошибка'),
            details: getErrorDetails(error),
            extra: extra === undefined ? (error && error.extra !== undefined ? error.extra : null) : extra,
            error
        });
    }

    function parseJsonOrThrow(text, message, extra) {
        try {
            return JSON.parse(text || 'null');
        } catch (error) {
            throw createError(message || 'Не удалось разобрать JSON', getErrorMessage(error), Object.assign({ text: trimErrorText(text, 200) }, extra || {}));
        }
    }

    const createHttpError = (status, responseText, prefix, extra) => createError((prefix || 'HTTP') + ' ' + status, trimErrorText(responseText, 200), extra);

    const createRequestError = (message, extra) => createError(message, '', extra);

    function requireUserscriptRequest() {
        const userscriptRequest = getUserscriptRequest();
        if (!userscriptRequest) throwError('Userscript request API is unavailable. Reinstall or update the script in Tampermonkey.');
        return userscriptRequest;
    }

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, Math.max(0, ms) || 0));

    function createNode(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text != null) node.textContent = text;
        return node;
    }

    function appendLink(parent, className, href, text) {
        if (!href) return;
        const link = createNode('a', className, text);
        link.href = href;
        link.target = '_blank';
        link.rel = 'noopener';
        parent.appendChild(link);
    }

    // Переиспользуемый drag-n-drop с живым предпросмотром (FLIP-анимация).
    // container — родитель элементов; itemSelector — селектор перетаскиваемых карточек
    // (у каждого data-idx = исходный индекс в массиве);
    // handleSelector — "ручка" (null = тащим за весь элемент);
    // onReorder(orderedIndexes) — по завершению отдаёт исходные индексы в новом порядке.
    //
    // Работает и для flex-, и для grid-списков: позиция вставки определяется по
    // ближайшему к курсору элементу, а не по вертикальному "before/after". Исходный
    // узел во время drag не двигается (схлопывается CSS-классом), двигается только
    // плейсхолдер. Реальная перестановка DOM — один раз, на dragend.
    function enableDragReorder(container, itemSelector, handleSelector, onReorder) {
        if (!container || container._dragReorderBound) return;
        container._dragReorderBound = true;
        let dragEl = null;
        let placeholder = null;

        // Все "живые" элементы списка (без плейсхолдера и без схлопнутого оригинала).
        const liveItems = () => Array.from(container.querySelectorAll(itemSelector))
            .filter(el => el !== placeholder && el !== dragEl);

        // FLIP: снимаем позиции ДО перестановки, затем анимируем разницу.
        function recordRects() {
            const map = new Map();
            Array.from(container.children).forEach(el => {
                if (el === dragEl) return;
                map.set(el, el.getBoundingClientRect());
            });
            return map;
        }
        function playFlip(prevRects) {
            Array.from(container.children).forEach(el => {
                if (el === dragEl) return;
                const prev = prevRects.get(el);
                if (!prev) return;
                const next = el.getBoundingClientRect();
                const dx = prev.left - next.left;
                const dy = prev.top - next.top;
                if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
                el.style.transition = 'none';
                el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
                requestAnimationFrame(() => {
                    el.style.transition = 'transform .16s ease';
                    el.style.transform = '';
                });
            });
        }

        // Куда вставить плейсхолдер: перебираем элементы сверху вниз и находим первый,
        // выше середины которого оказался курсор — плейсхолдер встаёт перед ним.
        // Порог = середина элемента, поэтому позиция меняется сразу при пересечении
        // половины соседа, а не когда курсор доедет до его центра.
        function computeInsertRef(x, y) {
            const els = liveItems();
            for (const el of els) {
                const r = el.getBoundingClientRect();
                if (y < r.top + r.height / 2) return el;
            }
            return null;
        }

        function movePlaceholderTo(refEl) {
            if (!placeholder) return;
            // refEl === placeholder или уже стоит перед refEl — ничего не делаем (антидребезг).
            if (refEl === placeholder) return;
            if (refEl === placeholder.nextSibling) return;
            const prevRects = recordRects();
            container.insertBefore(placeholder, refEl);
            playFlip(prevRects);
        }

        container.addEventListener('dragstart', e => {
            const handle = handleSelector ? e.target.closest(handleSelector) : e.target;
            const item = e.target.closest(itemSelector);
            if (!item || (handleSelector && !handle)) { e.preventDefault(); return; }
            dragEl = item;
            e.dataTransfer.effectAllowed = 'move';
            try { e.dataTransfer.setData('text/plain', item.dataset.idx || ''); } catch (err) {}
            try { e.dataTransfer.setDragImage(item, 10, 10); } catch (err) {}

            const rect = item.getBoundingClientRect();
            placeholder = createNode('div', 'rareDragPlaceholder');
            placeholder.style.height = rect.height + 'px';
            container.classList.add('rareDragging');
            container.insertBefore(placeholder, item.nextSibling);
            // Схлопываем оригинал ПОСЛЕ захвата drag-превью (setDragImage выше) —
            // визуально остаётся только плейсхолдер.
            requestAnimationFrame(() => { if (dragEl) dragEl.classList.add('rareDragActive'); });

            // Фикс "мигающего" not-allowed: браузер требует preventDefault() на каждом
            // dragenter/dragover. Ловим на document в фазе capture — раньше чужих обработчиков.
            document.addEventListener('dragenter', allowDrop, true);
            document.addEventListener('dragover', allowDrop, true);
        });

        function allowDrop(e) {
            if (!dragEl) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        }

        container.addEventListener('dragover', e => {
            if (!dragEl || !placeholder) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            const ref = computeInsertRef(e.clientX, e.clientY);
            movePlaceholderTo(ref);
        });

        container.addEventListener('drop', e => { e.preventDefault(); });

        container.addEventListener('dragend', () => {
            if (!dragEl) return;
            document.removeEventListener('dragenter', allowDrop, true);
            document.removeEventListener('dragover', allowDrop, true);
            dragEl.classList.remove('rareDragActive');
            dragEl.style.transition = '';
            dragEl.style.transform = '';
            container.classList.remove('rareDragging');
            if (placeholder) {
                container.insertBefore(dragEl, placeholder);
                placeholder.remove();
                placeholder = null;
            }
            const orderedIndexes = Array.from(container.querySelectorAll(itemSelector))
                .map(el => parseInt(el.dataset.idx, 10))
                .filter(n => Number.isFinite(n));
            dragEl = null;
            if (typeof onReorder === 'function') onReorder(orderedIndexes);
        });
    }

    const callIfFn = (fn) => { try { if (typeof fn === 'function') fn(); } catch (e) {} };

    importLztLocalStorageOnce();

    const CATEGORIES = {
        skins: {
            tabKey: 'skins',
            game: 'valorant',
            finder: 'dataKey',
            key: 'WeaponSkins',
            lsKey: 'rareSkins_wanted',
            gearTitle: 'Настройки редких предметов',
            listTitle: 'Скины VALORANT для поиска',
            listDesc: 'Добавьте названия скинов, которые нужно искать в объявлениях.',
            inputPlaceholder: 'Название скина',
            defaultColor: '#ffce14',
            defaultWanted: [
                { name: 'Нож-бабочка "Champions 2022"', color: '#ffce14', effect: 'shimmer' },
                { name: 'Керамбит "Champions 2021"', color: '#ffce14', effect: 'none' },
                { name: 'Sheriff "Аркейн"', color: '#ffce14', effect: 'shimmer' },
                { name: 'Phantom "Champions 2022"', color: '#ffce14', effect: 'none' },
                { name: 'Phantom "Champions 2024"', color: '#ffce14', effect: 'none' },
                { name: 'Нож-бабочка "Champions 2025"', color: '#ffce14', effect: 'none' },
                { name: 'Клинок "Champions 2024"', color: '#ffce14', effect: 'none' },
                { name: 'Мизерикордия "VCT LOCK//IN"', color: '#ffce14', effect: 'none' },
                { name: 'Vandal "Champions 2021"', color: '#ffce14', effect: 'none' },
                { name: 'Кунай "Champions 2023"', color: '#ffce14', effect: 'none' },
                { name: 'Vandal "Champions 2023"', color: '#ffce14', effect: 'none' },
                { name: 'Vandal "Champions 2025"', color: '#ffce14', effect: 'none' },
                { name: 'Керамбит "VCT 2025"', color: '#ffce14', effect: 'none' },
            ],
        },
        buddies: {
            tabKey: 'buddies',
            game: 'valorant',
            finder: 'dataKey',
            key: 'Buddy',
            lsKey: 'rareBuddies_wanted',
            gearTitle: 'Настройки редких брелков',
            listTitle: 'Брелки VALORANT для поиска',
            listDesc: 'Добавьте названия брелков, которые нужно искать в объявлениях.',
            inputPlaceholder: 'Название брелка',
            defaultColor: '#ffce14',
            defaultWanted: [
                { name: 'кулачки', color: '#237580', effect: 'none' },
                { name: 'радиант', color: '#258693', effect: 'none' },
            ],
        },
        lol: {
            tabKey: 'lol',
            game: 'lol',
            finder: 'riotText',
            key: 'lol_skins',
            lsKey: 'rareLol_wanted',
            gearTitle: 'Настройки редких скинов League of Legends',
            listTitle: 'Скины League of Legends для поиска',
            listDesc: 'Добавьте названия скинов League of Legends, которые нужно искать в объявлении Riot.',
            inputPlaceholder: 'Название скина LoL',
            defaultColor: '#ffce14',
            defaultWanted: [],
        },
        fortnite: {
            tabKey: 'fortnite',
            game: 'fortnite',
            finder: 'fortnite',
            key: 'Fortnite',
            lsKey: 'rareFortnite_wanted',
            gearTitle: 'Настройки редких скинов Fortnite',
            listTitle: 'Предметы Fortnite для поиска',
            listDesc: 'Добавьте названия предметов, которые нужно искать во всех разделах Fortnite.',
            inputPlaceholder: 'Название предмета',
            defaultColor: '#ffce14',
            defaultWanted: [
                { name: 'GALAXY', color: '#e2b200', effect: 'none' },
                { name: 'OG GHOUL TROOPER', color: '#e2b200', effect: 'shimmer' },
                { name: 'OG SKULL TROOPER', color: '#e2b200', effect: 'none' },
                { name: 'Renegade Raider (OG)', color: '#e2b200', effect: 'shimmer' },
                { name: 'Aerial Assault Trooper (OG)', color: '#bf9802', effect: 'none' },
                { name: "Raider's Revenge (OG)", color: '#ffce0a', effect: 'none' },
                { name: 'BLACK KNIGHT', color: '#e2b200', effect: 'none' },
                { name: 'WONDER', color: '#ffce14', effect: 'none' },
                { name: 'TRAVIS SCOTT', color: '#e2b200', effect: 'none' },
                { name: 'Honor Guard', color: '#e2b200', effect: 'none' },
                { name: 'Rogue Spider Knight', color: '#e2b200', effect: 'none' },
                { name: 'Royale Knight', color: '#e2b200', effect: 'none' },
                { name: 'AC/DC', color: '#e2b200', effect: 'none' },
                { name: 'Take The L', color: '#e2b200', effect: 'none' },
                { name: 'Mako', color: '#e2b200', effect: 'none' },
                { name: 'Rose Team Leader', color: '#e2b200', effect: 'none' },
                { name: 'The Reaper', color: '#e2b200', effect: 'none' },
                { name: 'IKONIK', color: '#e2b200', effect: 'shimmer' },
                { name: 'Sparkle Specialist', color: '#ffce14', effect: 'none' },
                { name: 'Royale Bomber', color: '#ffce14', effect: 'none' },
                { name: 'Glow', color: '#ffce14', effect: 'none' },
                { name: 'Blue Squire', color: '#ffce14', effect: 'none' },
                { name: 'Merry Mint Axe', color: '#ffce14', effect: 'none' },
                { name: 'Floss', color: '#ffce14', effect: 'none' },
                { name: 'Aerial Assault One (OG)', color: '#ffce14', effect: 'none' },
                { name: 'Rue', color: '#ffce14', effect: 'none' },
                { name: 'Wildcat', color: '#ffce14', effect: 'none' },
                { name: 'Eon', color: '#ffce14', effect: 'none' },
                { name: 'Dark Vertex', color: '#ffce14', effect: 'none' },
                { name: 'Leviathan Axe', color: '#ffce14', effect: 'none' },
            ],
        },
        genshin: {
            tabKey: 'mihoyo',
            game: 'mihoyo',
            finder: 'mihoyo',
            key: 'genshin_characters',
            lsKey: 'rareMihoyo_genshin_wanted',
            gearTitle: 'Настройки редких персонажей miHoYo',
            listTitle: 'Genshin Impact для поиска',
            listDesc: 'Добавьте персонажей Genshin Impact, которых нужно искать в объявлении.',
            inputPlaceholder: 'Название персонажа Genshin',
            defaultColor: '#ffce14',
            defaultWanted: [],
        },
        honkai: {
            tabKey: 'mihoyo',
            game: 'mihoyo',
            finder: 'mihoyo',
            key: 'honkai_characters',
            lsKey: 'rareMihoyo_honkai_wanted',
            gearTitle: 'Настройки редких персонажей miHoYo',
            listTitle: 'Honkai: Star Rail для поиска',
            listDesc: 'Добавьте персонажей Honkai: Star Rail, которых нужно искать в объявлении.',
            inputPlaceholder: 'Название персонажа Honkai',
            defaultColor: '#ffce14',
            defaultWanted: [],
        },
        zenless: {
            tabKey: 'mihoyo',
            game: 'mihoyo',
            finder: 'mihoyo',
            key: 'zenless_characters',
            lsKey: 'rareMihoyo_zenless_wanted',
            gearTitle: 'Настройки редких персонажей miHoYo',
            listTitle: 'Zenless Zone Zero для поиска',
            listDesc: 'Добавьте персонажей Zenless Zone Zero, которых нужно искать в объявлении.',
            inputPlaceholder: 'Название персонажа Zenless',
            defaultColor: '#ffce14',
            defaultWanted: [],
        },
        steam: {
            tabKey: 'steam',
            game: 'steam',
            finder: 'steam',
            key: 'Steam',
            lsKey: 'rareSteam_wanted',
            gearTitle: 'Настройки редких игр Steam',
            listTitle: 'Игры Steam для поиска',
            listDesc: 'Добавьте названия игр, которые нужно искать в списке игр аккаунта.',
            inputPlaceholder: 'Название игры',
            defaultColor: '#ffce14',
            defaultWanted: [{ name: 'Counter-Strike 2', color: '#ffce14' }],
        },
        steammedals: {
            tabKey: 'steam',
            game: 'steam',
            finder: 'steam',
            key: 'SteamMedals',
            lsKey: 'rareSteamMedals_wanted',
            gearTitle: 'Настройки редких медалей Steam',
            listTitle: 'Медали Steam для поиска',
            listDesc: 'Добавьте названия медалей, которые нужно искать в объявлении Steam.',
            inputPlaceholder: 'Название медали',
            defaultColor: '#ffce14',
            defaultWanted: [{ name: 'Global Offensive Badge', color: '#ffce14' }],
        },
        tanks: {
            tabKey: 'tanks',
            game: 'tanks',
            finder: 'tanks',
            key: 'tanks',
            lsKey: 'rareTanks_wanted',
            gearTitle: 'Настройки редких танков',
            listTitle: 'Танки для поиска',
            listDesc: 'Добавьте названия танков, которые нужно выделять на страницах World of Tanks.',
            inputPlaceholder: 'Название танка',
            defaultColor: '#ffce14',
            defaultWanted: [],
        },
        ubisoft: {
            tabKey: 'ubisoft',
            game: 'ubisoft',
            finder: 'dataKey',
            key: 'skins',
            lsKey: 'rareUbisoft_wanted',
            gearTitle: 'Настройки редких скинов Rainbow Six',
            listTitle: 'Скины Rainbow Six для поиска',
            listDesc: 'Добавьте названия скинов, которые нужно искать в объявлениях Rainbow Six.',
            inputPlaceholder: 'Название скина',
            defaultColor: '#ffce14',
            defaultWanted: [],
        },
        brawl: {
            tabKey: 'supercell',
            game: 'supercell',
            finder: 'brawl',
            key: 'brawlers',
            lsKey: 'rareBrawl_wanted',
            gearTitle: 'Настройки редких бойцов Brawl Stars',
            listTitle: 'Бойцы Brawl Stars для поиска',
            listDesc: 'Добавьте бойцов и минимальную силу под иконкой молнии. Боец попадет в блок только если сила не ниже порога.',
            inputPlaceholder: 'Имя бойца',
            defaultColor: '#ffce14',
            defaultWanted: [],
        },
    };

    const PALETTE = ['#cf1d3f', '#cf5400', '#d8ac0a', '#009765', '#0099ac', '#3164cf', '#7b41c8', '#b12fc6', '#737373'];
    const MAX_ITEMS = 100;
    function pluralizeRu(n, forms) {
        const num = Math.abs(parseInt(n, 10) || 0) % 100;
        const n1 = num % 10;
        if (num > 10 && num < 20) return forms[2];
        if (n1 > 1 && n1 < 5) return forms[1];
        if (n1 === 1) return forms[0];
        return forms[2];
    }
    function loadWanted(cat) {
        const arr = loadStoredJson(cat.lsKey, null);
        if (Array.isArray(arr)) {
            return arr.map(x => typeof x === 'string'
                ? { name: x, color: cat.defaultColor, effect: 'none' }
                : { name: x.name || '', color: x.color || cat.defaultColor, effect: x.effect === 'fire' ? 'shimmer' : (x.effect || 'none'), minPower: Math.max(0, parseInt(x.minPower, 10) || 0), minTrophies: Math.max(0, parseInt(x.minTrophies, 10) || 0), minRank: Math.max(0, parseInt(x.minRank, 10) || 0) });
        }
        return cat.defaultWanted.map(x => ({ name: x.name, color: x.color, effect: x.effect || 'none', minPower: Math.max(0, parseInt(x.minPower, 10) || 0), minTrophies: Math.max(0, parseInt(x.minTrophies, 10) || 0), minRank: Math.max(0, parseInt(x.minRank, 10) || 0) }));
    }
    const saveWanted = (cat, arr) => saveStoredJson(cat.lsKey, arr);

    // ─── Независимый фильтр по УРОВНЮ (отдельно от поиска по названию) ─────────
    // Показывает предметы с уровнем >= порога ВНЕ зависимости от названия. Работает
    // параллельно с поиском по именам (в блок попадают и совпавшие по имени, и
    // совпавшие по уровню). Хранится по ключу категории: { enabled, min }.
    const levelFilterLsKey = cat => 'rareLevel_' + (cat.lsKey || cat.key);
    function loadLevelFilter(cat) {
        const o = loadStoredJson(levelFilterLsKey(cat), null) || {};
        return { enabled: !!o.enabled, min: Math.max(0, parseInt(o.min, 10) || 0) };
    }
    const saveLevelFilter = (cat, o) => saveStoredJson(levelFilterLsKey(cat), { enabled: !!o.enabled, min: Math.max(0, parseInt(o.min, 10) || 0) });

    // Категории, у которых есть per-item уровень (иначе фильтр не показываем).
    const LEVEL_FILTER_CATS = { genshin: 1, honkai: 1, zenless: 1 };
    // Достаёт числовой уровень персонажа из li (форматы: «70 ур.», «ур. 80»,
    // «Уровень 39»). Возвращает 0, если не найден.
    function extractItemLevel(li) {
        if (!li) return 0;
        const el = li.querySelector('.role-medium-pos .inner .level, .role-medium-pos .level, .content p.level, p.level, .level');
        const txt = el ? (el.textContent || '') : '';
        const m = txt.match(/\d+/);
        return m ? (parseInt(m[0], 10) || 0) : 0;
    }

    Object.keys(CATEGORIES).forEach(key => { CATEGORIES[key].wanted = loadWanted(CATEGORIES[key]); });

    // Склонение слова "скин": 1 скин / 2 скина / 5 скинов.
    const pluralSkins = n => pluralizeRu(n, ['скин', 'скина', 'скинов']);

    // Адаптеры игр FunPay: как собрать данные с LZT и поля лота FunPay.
    const FUNPAY_ADAPTERS = {
        fortnite: {
            key: 'fortnite',
            label: 'Fortnite',
            ready: true,              // адаптер готов к публикации
            nodeId: '248',            // /lots/offerEdit?node=248 (дефолт, не редактируется в UI)
            defaultServerId: '1220',  // (PC) Battle Royale
            defaultAmount: '1',
            imageTypes: ['skins', 'pickaxes', 'dances', 'gliders'], // порядок = важность (лишние режем с конца)
            collect() {
                if (detectGame() !== 'fortnite') throwError('Откройте страницу товара Fortnite на LZT');
                const source = getAutoTitleSourceInfo(); // { count, names, unit }
                return { count: Math.max(0, source.count | 0), rareNames: source.names || [] };
            },
            buildTitle(data) {
                const countPart = data.count > 0 ? (data.count + ' ' + pluralSkins(data.count)) : '';
                const rare = (data.rareNames || []).slice();
                const build = () => [countPart, rare.join(', ')].filter(Boolean).join(' | ').trim();
                let out = build();
                while (out.length > FUNPAY_TITLE_MAX && rare.length) { rare.pop(); out = build(); }
                return out.length > FUNPAY_TITLE_MAX ? out.slice(0, FUNPAY_TITLE_MAX).trim() : out;
            },
            extraFields(data) {
                return {
                    'server_id': this.defaultServerId,
                    'fields[type]': 'Продажа',
                    'fields[skin]': String(data.count || 0)
                };
            }
        },
        valorant: {
            key: 'valorant',
            label: 'Valorant',
            ready: true,              // адаптер готов к публикации
            nodeId: '612',            // /lots/offerEdit?node=612
            defaultServerId: '4020',  // «Любой» (fallback, если регион не распознан)
            defaultAmount: '1',
            // Порядок = важность (лишние сверх 10 режем с конца).
            imageTypes: ['weapons', 'buddies'],
            collect() {
                if (detectGame() !== 'valorant') throwError('Откройте страницу товара Valorant на LZT');
                const skinCount = Math.max(0, getValorantSkinCount() | 0);
                const agentCount = Math.max(0, getValorantAgentCount() | 0);
                const regionName = getValorantRegionName();   // display name с LZT (регион)
                const rankName = getValorantRankName();        // «Текущий ранг»
                return {
                    count: skinCount,                          // {count} = скины
                    rareNames: getAutoTitleRareSkinNames(),    // {rare} = редкие скины Valorant (WeaponSkins)
                    agentCount, regionName, rankName           // идут только в поля FunPay, не в название
                };
            },
            // Название — как у Fortnite: {count} | {rare}. Агенты/ранг/регион в названии
            // НЕ участвуют (только в полях offerSave: fields[agent]/fields[rank]/server_id).
            buildTitle(data, baseCtx) {
                const ctx = Object.assign({ count: data.count, rareNames: data.rareNames || [], data, adapter: this }, baseCtx || {});
                return applyFunpayTemplate(FUNPAY_DEFAULT_TITLE, ctx, 'ru', FUNPAY_TITLE_MAX);
            },
            extraFields(data) {
                // Ранг обязателен на FunPay: если не распознан — «Калибровка не открыта».
                const rankFp = mapValorantRankToFunpay(data.rankName) || 'Калибровка не открыта';
                return {
                    'server_id': mapValorantRegionToServerId(data.regionName) || this.defaultServerId,
                    'fields[type]': 'Продажа',
                    'fields[rank]': rankFp,
                    'fields[agent]': String(data.agentCount || 0),
                    'fields[skins]': String(data.count || 0)
                };
            }
        }
    };

    // --- Маппинг Valorant: LZT (display name) -> FunPay ----------------------
    // Регион LZT -> server_id FunPay (node=612).
    // FunPay: Любой=4020, AP=7553, BR=4002, EU=3938, KR=4003, LATAM=4001, NA=3939, RU=3884, TR=8329.
    const VALORANT_REGION_TO_SERVER = {
        [norm('Европа')]: '3938',                    // EU
        [norm('Азиатско-Тихоокеанский')]: '7553',    // AP
        [norm('Корея')]: '4003',                     // KR
        [norm('Северная Америка')]: '3939',          // NA
        [norm('Бразилия')]: '4002',                  // BR
        [norm('Латинская Америка')]: '4001'          // LATAM
        // RU/TR намеренно НЕ добавляем: у Valorant на LZT это не регионы (RU/TR —
        // регионы LoL), а на FunPay RU/TR = тот же EU-сервер. Так что игнорируем.
    };
    function mapValorantRegionToServerId(regionName) {
        return VALORANT_REGION_TO_SERVER[norm(regionName)] || '';
    }

    // Ранг LZT (англ., напр. «Gold 1») -> value fields[rank] на FunPay.
    // Для спец-статусов FunPay ждёт не label, а реальные option value из select.
    const VALORANT_RANK_TIER = {
        iron: 'Железо', bronze: 'Бронза', silver: 'Серебро', gold: 'Золото',
        platinum: 'Платина', diamond: 'Алмаз', ascendant: 'Расцвет',
        immortal: 'Бессмертный', radiant: 'Радиант'
    };
    const FUNPAY_VALORANT_RANK_LOCKED = '%Калибровка не открыта-Ranked locked';
    const FUNPAY_VALORANT_RANK_READY = '%Под калибровку-Ranked unlocked';
    function mapValorantRankToFunpay(rankName) {
        const raw = String(rankName || '').trim();
        if (!raw) return '';
        const low = norm(raw);
        if (low === norm('Радиант') || low === 'radiant') return 'Радиант';
        if (/ranked ready/i.test(raw)) return FUNPAY_VALORANT_RANK_READY;
        if (/unrated|unranked|без ранга|нет ранга|калибровк/i.test(raw)) return FUNPAY_VALORANT_RANK_LOCKED;
        // «Gold 1» / «Золото 1» -> tier + номер
        const m = raw.match(/([A-Za-zА-Яа-яё]+)\s*([1-3])?/);
        if (!m) return '';
        const tierKey = m[1].toLowerCase();
        let tierRu = VALORANT_RANK_TIER[tierKey];
        if (!tierRu) {
            // если пришёл уже русский тир
            const ruTiers = ['железо', 'бронза', 'серебро', 'золото', 'платина', 'алмаз', 'расцвет', 'бессмертный', 'радиант'];
            const found = ruTiers.find(t => t === norm(m[1]));
            if (!found) return '';
            tierRu = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
        }
        if (tierRu === 'Радиант') return 'Радиант';
        const div = m[2] || '1';
        return tierRu + ' ' + div;
    }
    const FUNPAY_ADAPTER_KEYS = Object.keys(FUNPAY_ADAPTERS);

    // Цена по умолчанию (пока не задана отдельно): специально высокая, чтобы лот
    // не купили до ручной корректировки.
    const FUNPAY_DEFAULT_PRICE = '99999';

    // Настройки категории FunPay. node_id / server_id / amount / price берутся из
    // дефолтов и в UI не редактируются (для будущих игр значения свои в адаптере).
    const FUNPAY_DEFAULT_TITLE = '{count} | {rare}';
    function defaultFunpayCategoryCfg() {
        return {
            summaryRu: FUNPAY_DEFAULT_TITLE, summaryEn: FUNPAY_DEFAULT_TITLE, // название лота RU/EN
            descRu: '', descEn: ''                                            // подробное описание RU/EN
        };
    }

    function detectGame() {
        const path = (location.pathname || '').toLowerCase();
        const crumbs = document.querySelectorAll('.breadBoxTop .crumb, .breadcrumb .crumb, .breadcrumb a.crumb');
        for (const c of crumbs) {
            const t = ((c.textContent || '') + ' ' + (c.getAttribute('href') || '')).toLowerCase();
            if (t.indexOf('brawl stars') !== -1 || t.indexOf('supercell') !== -1) return 'supercell';
            if (t.indexOf('fortnite') !== -1) return 'fortnite';
            if (t.indexOf('valorant') !== -1 || t.indexOf('riot') !== -1) return 'valorant';
            if (t.indexOf('mihoyo') !== -1 || t.indexOf('genshin') !== -1 || t.indexOf('honkai') !== -1 || t.indexOf('zenless') !== -1) return 'mihoyo';
            if (t.indexOf('steam') !== -1) return 'steam';
            if (t.indexOf('world of tanks') !== -1 || t.indexOf('wargaming') !== -1) return 'tanks';
            if (t.indexOf('escape from tarkov') !== -1 || t.indexOf('tarkov') !== -1) return 'tarkov';
            if (t.indexOf('ubisoft') !== -1 || t.indexOf('uplay') !== -1) return 'ubisoft';
        }
        if (path.indexOf('/escape-from-tarkov') !== -1 || path.indexOf('/tarkov') !== -1) return 'tarkov';
        if (path.indexOf('/brawl-stars') !== -1 || path.indexOf('/supercell') !== -1) return 'supercell';
        if (path.indexOf('/mihoyo') !== -1) return 'mihoyo';
        if (path.indexOf('/world-of-tanks') !== -1) return 'tanks';
        if (document.querySelector('ul[data-key="brawlers"], .supercellBrawler')) return 'supercell';
        if (document.querySelector('.fortniteItems, .marketFortniteCommonInfo, .fortnitePastSeasonsSection')) return 'fortnite';
        if (document.querySelector('ul[data-key="genshin_characters"], ul[data-key="honkai_characters"], ul[data-key="zenless_characters"]')) return 'mihoyo';
        if (document.querySelector('.SteamGamesFilter, .steamGamesFilter, ul[data-key="Steam"], .steamGamesContainer')) return 'steam';
        if (document.querySelector('.tankList .tank, [id^="WotTanks_"] .tankList')) return 'tanks';
        if (document.querySelector('.marketItemView--counters .counter .muted') && /escape from tarkov|последний рейд/i.test(document.body.textContent || '')) return 'tarkov';
        if (document.querySelector('ul[data-key="WeaponSkins"], ul[data-key="Buddy"]')) return 'valorant';
        if (document.querySelector('.marketItemView--gamesContainer.lolItems ul.body, .lolItems ul.body')) return 'valorant';
        return null;
    }

    const ACT_LS_KEY = 'rareActivity_levels';
    const DEFAULT_LEVELS = [
        { min: 0,   max: 14,   color: '#ff2d55', effect: 'none'  },
        { min: 14,  max: 30,   color: '#ffce14', effect: 'none'  },
        { min: 30,  max: 90,   color: '#00ba78', effect: 'none'  },
        { min: 90,  max: 365,  color: '#00ba78', effect: 'glow'  },
        { min: 365, max: null, color: '#ff6a00', effect: 'fire'  },
    ];
    const sanitizeActivityEffect = (effect) => (effect === 'glow' || effect === 'fire') ? effect : 'none';
    function normalizeStoredLevels(levels) {
        if (!Array.isArray(levels) || !levels.length) {
            return DEFAULT_LEVELS.map(l => ({ min: l.min, max: l.max, color: l.color, effect: l.effect }));
        }
        return levels.map(l => ({
            min: (l.min === null || l.min === undefined || l.min === '') ? 0 : parseInt(l.min, 10),
            max: (l.max === null || l.max === undefined || l.max === '') ? null : parseInt(l.max, 10),
            color: l.color || '#ffce14',
            effect: sanitizeActivityEffect(l.effect)
        }));
    }
    const loadLevels = () => loadStoredState(ACT_LS_KEY, null, normalizeStoredLevels);
    const saveLevels = arr => saveStoredJson(ACT_LS_KEY, arr);
    let ACT_LEVELS = loadLevels();

    const CUSTOM_LS_KEY = 'rareCustom_settings';
    const STATS_CACHE_KEY = 'rareStats_cache_v1';
    const STATS_CACHE_TTL = 30 * 60 * 1000;
    const PUBLISHED_AGE_CACHE_KEY = 'rarePublishedAge_cache_v1';
    const PUBLISHED_AGE_CACHE_TTL = 12 * 60 * 60 * 1000;
    const PUBLISHED_AGE_BATCH_DELAY = 1200;
    const PUBLISHED_AGE_PAGE_DELAY = 3200;
    const PUBLISHED_AGE_MAX_PAGES = 12;
    const API_SETTINGS_LS_KEY = 'rareApi_settings';
    const DISMISSED_HINTS_LS_KEY = 'rareDismissedHints_v1';
    const CUSTOM_PALETTES = {
        emerald: { label: 'Emerald', btnColor: '#2f8f6a', headColor: '#48b889', accentColor: '#3fbc87', panelColor: '#9e8550', modalBg: '#121916', modalBgSoft: '#18221d', modalBgStrong: '#0e1411', modalSidebar: 'rgba(17,24,20,.72)', modalCard: 'rgba(21,30,26,.72)' },
        amber: { label: 'Amber', btnColor: '#8c6a34', headColor: '#d2a55d', accentColor: '#bf8f43', panelColor: '#b48b48', modalBg: '#18140f', modalBgSoft: '#211b14', modalBgStrong: '#120f0b', modalSidebar: 'rgba(27,21,16,.76)', modalCard: 'rgba(31,24,18,.74)' },
        rose: { label: 'Rose', btnColor: '#8a4f63', headColor: '#cb8198', accentColor: '#b96c84', panelColor: '#a97b64', modalBg: '#181217', modalBgSoft: '#221821', modalBgStrong: '#130d12', modalSidebar: 'rgba(28,19,26,.74)', modalCard: 'rgba(33,22,30,.74)' },
        violet: { label: 'Violet', btnColor: '#5f567f', headColor: '#9e93ca', accentColor: '#8579b4', panelColor: '#8f7a99', modalBg: '#15131a', modalBgSoft: '#1d1a25', modalBgStrong: '#100e14', modalSidebar: 'rgba(23,21,31,.75)', modalCard: 'rgba(28,25,37,.74)' },
        slate: { label: 'Slate', btnColor: '#47606f', headColor: '#86a5b6', accentColor: '#6f91a4', panelColor: '#7f8e98', modalBg: '#111518', modalBgSoft: '#192026', modalBgStrong: '#0d1013', modalSidebar: 'rgba(18,23,28,.74)', modalCard: 'rgba(22,28,34,.72)' },
        copper: { label: 'Copper', btnColor: '#8a5b43', headColor: '#cb8a69', accentColor: '#ba7754', panelColor: '#b78659', modalBg: '#17120f', modalBgSoft: '#211914', modalBgStrong: '#120d0a', modalSidebar: 'rgba(26,19,15,.75)', modalCard: 'rgba(31,22,18,.74)' },
        olive: { label: 'Olive', btnColor: '#66723d', headColor: '#a6bb6b', accentColor: '#8ca857', panelColor: '#95854f', modalBg: '#14150f', modalBgSoft: '#1c1f14', modalBgStrong: '#101109', modalSidebar: 'rgba(22,24,16,.75)', modalCard: 'rgba(27,30,20,.74)' },
        wine: { label: 'Wine', btnColor: '#7b4251', headColor: '#c2758f', accentColor: '#aa5d77', panelColor: '#9d6b5f', modalBg: '#171014', modalBgSoft: '#21161c', modalBgStrong: '#110b0f', modalSidebar: 'rgba(25,17,22,.75)', modalCard: 'rgba(31,21,27,.74)' },
        ocean: { label: 'Ocean', btnColor: '#356d77', headColor: '#6db5c2', accentColor: '#4f9dab', panelColor: '#6d8f95', modalBg: '#10161a', modalBgSoft: '#152027', modalBgStrong: '#0b1013', modalSidebar: 'rgba(16,22,27,.75)', modalCard: 'rgba(20,28,34,.74)' },
        ash: { label: 'Ash', btnColor: '#5f666c', headColor: '#a3adb7', accentColor: '#868f98', panelColor: '#8b8176', modalBg: '#131415', modalBgSoft: '#1b1d1f', modalBgStrong: '#0e0f10', modalSidebar: 'rgba(20,22,23,.75)', modalCard: 'rgba(25,27,29,.74)' },
    };
    const DEFAULT_CUSTOM = {
        btnColor: '#2f8f6a',
        btnShow: true,
        headColor: '#48b889',
        accentColor: '#3fbc87',
        panelColor: '#9e8550',
        palette: 'emerald',
        modalBg: '#121916',
        modalBgSoft: '#18221d',
        modalBgStrong: '#0e1411',
        modalSidebar: 'rgba(17,24,20,.72)',
        modalCard: 'rgba(21,30,26,.72)',
    };
    const MENU_PALETTE = Array.from(new Set([DEFAULT_CUSTOM.panelColor, '#000000'].concat(PALETTE.map(color => saturate(color, 0.15)).map(color => color.toLowerCase()))));
    const DEFAULT_API_SETTINGS = {
        token: '',
        publishedAgeEnabled: true,
        cs2InventoryPriceEnabled: true,
    };
    const paletteByKey = (key) => CUSTOM_PALETTES[key] || CUSTOM_PALETTES[DEFAULT_CUSTOM.palette];
    function buildDefaultCustom() {
        const fallback = Object.assign({}, DEFAULT_CUSTOM);
        applyPaletteToCustom(fallback, fallback.palette);
        return fallback;
    }
    function normalizeStoredCustom(o) {
        if (!o || typeof o !== 'object') return buildDefaultCustom();
        const merged = Object.assign({}, DEFAULT_CUSTOM, o);
        merged.btnShow = true;
        if (!CUSTOM_PALETTES[merged.palette]) merged.palette = DEFAULT_CUSTOM.palette;
        if (merged.btnColor === '#9b59f6' || merged.btnColor === '#3e285c') merged.btnColor = DEFAULT_CUSTOM.btnColor;
        if (merged.headColor === '#ffce14') merged.headColor = DEFAULT_CUSTOM.headColor;
        if (merged.accentColor === '#9b59f6') merged.accentColor = DEFAULT_CUSTOM.accentColor;
        merged.panelColor = /^#[0-9a-f]{6}$/i.test(merged.panelColor || '') ? merged.panelColor : DEFAULT_CUSTOM.panelColor;
        if (!o.palette) applyPaletteToCustom(merged, merged.palette);
        return merged;
    }
    const loadCustom = () => loadStoredState(CUSTOM_LS_KEY, null, normalizeStoredCustom);
    const saveCustom = o => saveStoredJson(CUSTOM_LS_KEY, o);
    let CUSTOM = loadCustom();
    function normalizeApiSettings(o) {
        const next = Object.assign({}, DEFAULT_API_SETTINGS, o || {});
        next.token = String(next.token || '')
            .replace(/^Bearer\s+/i, '')
            .replace(/[\u0000-\u0020\u007f-\u00a0\u1680\u2000-\u200d\u2028\u2029\u202f\u205f\u3000]+/g, '')
            .trim();
        next.publishedAgeEnabled = next.publishedAgeEnabled !== false;
        next.cs2InventoryPriceEnabled = next.cs2InventoryPriceEnabled !== false;
        delete next.autoBumpEnabled;
        delete next.autoBumpHours;
        delete next.autoStickEnabled;
        delete next.autoStickCount;
        return next;
    }
    function makeSettingsStore(key, defaults, normalize) {
        return {
            load: () => loadNormalizedStoredJson(key, defaults, normalize),
            save: o  => saveNormalizedStoredJson(key, o, normalize)
        };
    }
    const _apiStore    = makeSettingsStore(API_SETTINGS_LS_KEY,    DEFAULT_API_SETTINGS,    normalizeApiSettings);
    const loadApiSettings    = () => _apiStore.load();
    const saveApiSettings    = o  => _apiStore.save(o);
    function withTimeout(promise, timeoutMs, message) {
        const ms = Math.max(1, parseInt(timeoutMs, 10) || 0);
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(createError(message || 'Timeout')), ms);
            Promise.resolve(promise).then(
                value => { clearTimeout(timer); resolve(value); },
                err => { clearTimeout(timer); reject(err); }
            );
        });
    }
    const loadDismissedHints  = ()    => loadStoredObject(DISMISSED_HINTS_LS_KEY);
    const isHintDismissed = (hintId) => !!loadDismissedHints()[hintId];
    function dismissHint(hintId) {
        updateStoredObject(DISMISSED_HINTS_LS_KEY, next => {
            next[hintId] = 1;
        });
    }
    const resetDismissedHints = () => storageRemove(DISMISSED_HINTS_LS_KEY);
    let API_SETTINGS = loadApiSettings();
    const CONFIG_CATEGORY_KEYS = ['skins', 'buddies', 'lol', 'fortnite', 'genshin', 'honkai', 'zenless', 'steam', 'steammedals', 'tanks', 'ubisoft', 'brawl'];

    function normalizeWantedItems(items, fallback) {
        const src = Array.isArray(items) ? items : fallback;
        return src.map(x => ({
            name: String((x && x.name) || '').trim(),
            color: ((x && x.color) || fallback[0] && fallback[0].color || '#ffce14'),
            effect: (x && x.effect) || 'none',
            minPower: Math.max(0, parseInt(x && x.minPower, 10) || 0),
            minTrophies: Math.max(0, parseInt(x && x.minTrophies, 10) || 0),
            minRank: Math.max(0, parseInt(x && x.minRank, 10) || 0)
        })).filter(x => x.name);
    }

    function normalizeConfigLevels(levels) {
        const src = Array.isArray(levels) && levels.length ? levels : DEFAULT_LEVELS;
        return src.map(l => ({
            min: (l && l.min != null && l.min !== '') ? parseInt(l.min, 10) || 0 : 0,
            max: (l && l.max != null && l.max !== '') ? parseInt(l.max, 10) : null,
            color: (l && l.color) || '#ffce14',
            effect: sanitizeActivityEffect(l && l.effect)
        })).sort((a, b) => a.min - b.min);
    }

    function normalizeConfigCustom(custom) {
        const next = Object.assign({}, DEFAULT_CUSTOM, custom || {});
        if (!CUSTOM_PALETTES[next.palette]) next.palette = DEFAULT_CUSTOM.palette;
        next.panelColor = /^#[0-9a-f]{6}$/i.test(next.panelColor || '') ? next.panelColor : DEFAULT_CUSTOM.panelColor;
        return next;
    }

    const isPlainObject = (value) => !!value && typeof value === 'object' && !Array.isArray(value);

    const pickKeys = (obj, keys) => keys.reduce((acc, k) => { acc[k] = obj[k]; return acc; }, {});
    const CUSTOM_CONFIG_KEYS = ['btnColor', 'btnShow', 'headColor', 'accentColor', 'panelColor', 'palette', 'modalBg', 'modalBgSoft', 'modalBgStrong', 'modalSidebar', 'modalCard'];

    function validateImportedSettingsConfig(config) {
        if (!isPlainObject(config)) throw new Error('Config must be an object');
        if (config.version != null && config.version !== 1) throw new Error('Unsupported config version');
        if (config.wanted != null && !isPlainObject(config.wanted)) throw new Error('Invalid wanted section');
        if (config.activityLevels != null && !Array.isArray(config.activityLevels)) throw new Error('Invalid activityLevels section');
        if (config.custom != null && !isPlainObject(config.custom)) throw new Error('Invalid custom section');

        const wanted = {};
        const sourceWanted = isPlainObject(config.wanted) ? config.wanted : {};
        CONFIG_CATEGORY_KEYS.forEach(key => {
            const rawItems = Array.isArray(sourceWanted[key]) ? sourceWanted[key].slice(0, 500) : [];
            wanted[key] = rawItems.map(item => {
                if (typeof item === 'string') {
                    return { name: item.slice(0, 80), color: NEW_WANTED_COLOR, effect: 'none' };
                }
                if (!isPlainObject(item)) return null;
                return {
                    name: String(item.name || '').slice(0, 80),
                    color: String(item.color || NEW_WANTED_COLOR).slice(0, 32),
                    effect: String(item.effect || 'none').slice(0, 16),
                    minPower: Math.max(0, parseInt(item.minPower, 10) || 0)
                };
            }).filter(Boolean);
        });

        const activityLevels = (Array.isArray(config.activityLevels) ? config.activityLevels : []).slice(0, 64).map(level => {
            if (!isPlainObject(level)) return null;
            return {
                min: level.min,
                max: level.max,
                color: String(level.color || '').slice(0, 32),
                effect: String(level.effect || 'none').slice(0, 16)
            };
        }).filter(Boolean);

        const custom = isPlainObject(config.custom) ? pickKeys(config.custom, CUSTOM_CONFIG_KEYS) : {};

        return {
            version: 1,
            wanted,
            activityLevels,
            custom
        };
    }

    function applySettingsConfig(config) {
        const data = validateImportedSettingsConfig(config);
        const wanted = (data.wanted && typeof data.wanted === 'object') ? data.wanted : {};
        CONFIG_CATEGORY_KEYS.forEach(key => {
            const cat = CATEGORIES[key];
            cat.wanted = normalizeWantedItems(wanted[key], cat.defaultWanted);
            saveWanted(cat, cat.wanted);
        });
        ACT_LEVELS = normalizeConfigLevels(data.activityLevels);
        saveLevels(ACT_LEVELS);
        CUSTOM = normalizeConfigCustom(data.custom);
        saveCustom(CUSTOM);
    }

    function applyPaletteToCustom(target, key) {
        const palette = paletteByKey(key);
        target.palette = key;
        target.btnColor = palette.btnColor;
        target.headColor = palette.headColor;
        target.accentColor = palette.accentColor;
        target.panelColor = /^#[0-9a-f]{6}$/i.test(target.panelColor || '') ? target.panelColor : DEFAULT_CUSTOM.panelColor;
        target.modalBg = muteColor(palette.modalBg, 0.18);
        target.modalBgSoft = muteColor(palette.modalBgSoft, 0.18);
        target.modalBgStrong = muteColor(palette.modalBgStrong, 0.18);
        target.modalSidebar = muteColor(palette.modalSidebar, 0.18);
        target.modalCard = muteColor(palette.modalCard, 0.18);
    }

    function panelBgPresetCss(color) {
        const mid = shade(color, -0.42);
        const edge = shade(color, -0.78);
        return {
            bgColor: edge,
            bgImage: 'linear-gradient(180deg,' + hexToRgba(shade(color, 0.08), 0.30) + ' 0%,' + hexToRgba(mid, 0.22) + ' 30%,' + hexToRgba(edge, 0.96) + ' 100%),radial-gradient(circle at 22% 0%,' + hexToRgba(shade(color, 0.24), 0.26) + ' 0%,transparent 34%),radial-gradient(circle at 78% 12%,rgba(255,255,255,.10) 0%,transparent 26%),linear-gradient(120deg,rgba(255,255,255,.04) 0%,rgba(255,255,255,0) 22%,rgba(255,255,255,.025) 44%,rgba(255,255,255,0) 68%)'
        };
    }

    function applyCustom() {
        const panelBg = panelBgPresetCss(CUSTOM.panelColor || DEFAULT_CUSTOM.panelColor);
        const accentRgb = CUSTOM.accentColor.replace('#', '');
        const btn = document.getElementById('rareFloatBtn');
        if (btn) {
            btn.style.setProperty('background', 'linear-gradient(180deg,' + hexToRgba(CUSTOM.btnColor, 0.34) + ',' + hexToRgba(CUSTOM.btnColor, 0.18) + '), rgb(10,12,16)', 'important');
            btn.style.setProperty('border-color', hexToRgba(CUSTOM.btnColor, 0.34), 'important');
            btn.style.setProperty('box-shadow', '0 10px 34px ' + hexToRgba(CUSTOM.btnColor, 0.20), 'important');
            btn.style.setProperty('color', CUSTOM.headColor, 'important');
            const icon = btn.querySelector('svg');
            if (icon) {
                icon.style.setProperty('color', CUSTOM.headColor, 'important');
                icon.style.setProperty('stroke', 'currentColor', 'important');
            }
            btn.dataset.hoverBg = 'linear-gradient(180deg,' + hexToRgba(shade(CUSTOM.btnColor, 0.18), 0.40) + ',' + hexToRgba(CUSTOM.btnColor, 0.22) + '), rgb(12,14,18)';
        }
        document.querySelectorAll('.rareHeadInline, .rareHeadInline .rareGridTitle')
            .forEach(el => el.style.setProperty('color', CUSTOM.headColor, 'important'));
        document.documentElement.style.setProperty('--rare-panel-color', CUSTOM.panelColor || DEFAULT_CUSTOM.panelColor);
        document.documentElement.style.setProperty('--rare-panel-bg', panelBg.bgColor);
        document.documentElement.style.setProperty('--rare-panel-bg-image', panelBg.bgImage);
        document.documentElement.style.setProperty('--rare-accent', CUSTOM.accentColor);
        document.documentElement.style.setProperty('--rare-accent-rgb', parseInt(accentRgb.substring(0,2),16) + ',' + parseInt(accentRgb.substring(2,4),16) + ',' + parseInt(accentRgb.substring(4,6),16));
        document.documentElement.style.setProperty('--rare-modal-bg', CUSTOM.modalBg);
        document.documentElement.style.setProperty('--rare-modal-bg-soft', CUSTOM.modalBgSoft);
        document.documentElement.style.setProperty('--rare-modal-bg-strong', CUSTOM.modalBgStrong);
        document.documentElement.style.setProperty('--rare-modal-sidebar', CUSTOM.modalSidebar);
        document.documentElement.style.setProperty('--rare-modal-card', CUSTOM.modalCard);
        refreshPanelColorDependentUi();
    }

    let rareToastTimer = 0;
    let rareHintToastTimer = 0;
    let rareErrorToastLastKey = '';
    let rareErrorToastLastAt = 0;
    const PRICE_SEARCH_HINT_ID = 'price-search-context';
    const FUNPAY_EN_TRANSLIT_HINT_ID = 'funpay-en-translit';
    // Общий стек тостов: единый fixed-контейнер (flex column-reverse) снизу экрана.
    // Все тосты кладутся сюда и автоматически выстраиваются друг над другом без
    // наложений — вместо прежней общей точки bottom:18px, где всё перекрывалось.
    function ensureToastStack() {
        let stack = document.querySelector('.rareToastStack');
        if (!stack) {
            stack = createNode('div', 'rareToastStack');
            document.body.appendChild(stack);
        }
        return stack;
    }
    // Помещает тост в стек (если ещё не там). column-reverse => свежие снизу.
    function mountToast(toast) {
        const stack = ensureToastStack();
        if (toast.parentNode !== stack) stack.appendChild(toast);
        return toast;
    }

    function getMainToast() {
        let toast = document.querySelector('.rareMainToast');
        if (!toast) {
            toast = createNode('div', 'rareToast rareMainToast');
            toast.innerHTML = '<span class="rareToastCheck"></span><span class="rareToastText"></span>';
            mountToast(toast);
        }
        if (!toast._rareToastCheck) toast._rareToastCheck = toast.querySelector('.rareToastCheck');
        if (!toast._rareToastText) toast._rareToastText = toast.querySelector('.rareToastText');
        return toast;
    }

    function showToastCore(text, isError, accent, accentRgb, bg, timeout, forceReflow) {
        const toast = getMainToast();
        toast.classList.toggle('is-error', isError);
        const icon = toast._rareToastCheck;
        if (icon) icon.innerHTML = isError
            ? '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>'
            : '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
        toast.style.setProperty('--rare-toast-accent',     accent);
        toast.style.setProperty('--rare-toast-accent-rgb', accentRgb);
        toast.style.setProperty('--rare-toast-bg',         bg);
        const label = toast._rareToastText;
        if (label) label.textContent = text;
        clearTimeout(rareToastTimer);
        if (forceReflow) { toast.classList.remove('show'); void toast.offsetWidth; }
        // Показ: сначала снимаем display:none (через .show), даём кадр на раскладку,
        // затем анимируем вход. Стек сам разводит тосты — ручного bottom больше нет.
        showToastEl(toast);
        rareToastTimer = setTimeout(() => toast.classList.remove('show'), timeout);
    }
    // Плавный показ тоста из стека: монтируем в стек и на следующем кадре
    // включаем .show (fade/slide). Скрытые тосты position:absolute — вне потока.
    function showToastEl(toast) {
        mountToast(toast);
        void toast.offsetWidth;
        toast.classList.add('show');
    }
    function showThemeToast(text) {
        const accent = CUSTOM.accentColor || DEFAULT_CUSTOM.accentColor;
        showToastCore(text, false, accent, hexToRgbList(accent), CUSTOM.modalBg || DEFAULT_CUSTOM.modalBg, 5000, false);
    }
    function showErrorToast(text, key) {
        const now = Date.now(), toastKey = key || text;
        if (toastKey === rareErrorToastLastKey && now - rareErrorToastLastAt < 6000) return;
        rareErrorToastLastKey = toastKey; rareErrorToastLastAt = now;
        showToastCore(text, true, '#ff5c5c', '255,92,92', '#1b0b0d', 6000, true);
    }

    // Постоянный тост процесса публикации: висит, пока идёт публикация. Закрыть
    // обычным способом нельзя — есть только кнопка «Отменить» (полная отмена:
    // останавливает очередь и очищает её). Снимается при успехе/ошибке через
    // hideFunpayPublishingToast() либо кнопкой отмены.
    function getFunpayPublishingToast() {
        let toast = document.querySelector('.rareFpPublishToast');
        if (!toast) {
            toast = createNode('div', 'rareToast rareFpPublishToast');
            toast.innerHTML = '<span class="rareFpSpinner"></span><span class="rareFpPublishText"><span class="rareFpPublishTitle">FunPay</span><span class="rareFpPublishBody"></span></span>'
                + '<button type="button" class="rareFpPublishCancel" title="Отменить публикацию и очистить очередь">Отменить</button>';
            const cancelBtn = toast.querySelector('.rareFpPublishCancel');
            if (cancelBtn) cancelBtn.addEventListener('click', funpayCancelAll);
            mountToast(toast);
        }
        if (!toast._body) toast._body = toast.querySelector('.rareFpPublishBody');
        if (!toast._cancel) toast._cancel = toast.querySelector('.rareFpPublishCancel');
        return toast;
    }
    function showFunpayPublishingToast(text) {
        const accent = CUSTOM.accentColor || DEFAULT_CUSTOM.accentColor;
        const toast = getFunpayPublishingToast();
        toast.classList.remove('is-error');
        toast.style.setProperty('--rare-toast-accent', accent);
        toast.style.setProperty('--rare-toast-accent-rgb', hexToRgbList(accent));
        toast.style.setProperty('--rare-toast-bg', CUSTOM.modalBg || DEFAULT_CUSTOM.modalBg);
        // text===undefined => не трогаем текст (сохраняем детальный прогресс цикла).
        if (toast._body && text !== undefined) toast._body.textContent = text || 'Публикация лота…';
        else if (toast._body && !toast._body.textContent) toast._body.textContent = 'Публикация лота…';
        showToastEl(toast);
    }
    function updateFunpayPublishingToast(text) {
        const toast = document.querySelector('.rareFpPublishToast');
        if (toast && toast.classList.contains('show') && toast._body) toast._body.textContent = text || '';
    }
    function hideFunpayPublishingToast() {
        const toast = document.querySelector('.rareFpPublishToast');
        if (toast) toast.classList.remove('show');
    }

    // Тост процесса подсчёта «дней с публикации» (тот же паттерн, что FunPay-тост
    // публикации): показывается пока идёт запрос к API категории, скрывается по
    // готовности. При ошибке — красный тост с краткой причиной (не висит вечно).
    function getPublishedAgeProgressToast() {
        let toast = document.querySelector('.rarePublishedAgeToast');
        if (!toast) {
            toast = createNode('div', 'rareToast rarePublishedAgeToast');
            toast.innerHTML = '<span class="rareFpSpinner"></span><span class="rareFpPublishText"><span class="rareFpPublishTitle">Дни с публикации</span><span class="rareFpPublishBody"></span></span>';
            mountToast(toast);
            toast._body = toast.querySelector('.rareFpPublishBody');
        }
        return toast;
    }
    function showPublishedAgeProgressToast(text) {
        const accent = CUSTOM.accentColor || DEFAULT_CUSTOM.accentColor;
        const toast = getPublishedAgeProgressToast();
        toast.classList.remove('is-error');
        toast.style.setProperty('--rare-toast-accent', accent);
        toast.style.setProperty('--rare-toast-accent-rgb', hexToRgbList(accent));
        toast.style.setProperty('--rare-toast-bg', CUSTOM.modalBg || DEFAULT_CUSTOM.modalBg);
        if (toast._body) toast._body.textContent = text || 'Считаю дни с публикации…';
        showToastEl(toast);
    }
    function hidePublishedAgeProgressToast() {
        const toast = document.querySelector('.rarePublishedAgeToast');
        if (toast) toast.classList.remove('show');
    }
    // Ошибка показывается коротким тостом (не постоянным) с причиной и сама скрывается.
    function showPublishedAgeErrorToast(reason) {
        const toast = getPublishedAgeProgressToast();
        toast.classList.add('is-error');
        toast.style.setProperty('--rare-toast-accent', '#ff5c5c');
        toast.style.setProperty('--rare-toast-accent-rgb', '255,92,92');
        toast.style.setProperty('--rare-toast-bg', '#1b0b0d');
        if (toast._body) toast._body.textContent = 'Не удалось посчитать: ' + (reason || 'ошибка запроса');
        showToastEl(toast);
        clearTimeout(toast._errHideTimer);
        toast._errHideTimer = setTimeout(() => { toast.classList.remove('show'); }, 6000);
    }
    // Синхронизирует постоянный тост с СОСТОЯНИЕМ ОЧЕРЕДИ, а не только с локальным
    // циклом публикации. Благодаря этому тост висит на ЛЮБОЙ вкладке, где есть
    // активная очередь (в т.ч. на той, что только поставила лот, но публикует
    // другая вкладка). Детальный прогресс на обрабатывающей вкладке пишет сам цикл.
    function funpaySyncPublishingToast() {
        const count = loadFunpayQueue().length;
        if (count > 0) {
            // Не перетираем детальный прогресс на обрабатывающей вкладке.
            if (funpayQueueRunning) { showFunpayPublishingToast(undefined); return; }
            showFunpayPublishingToast('Публикация лота…' + (count > 1 ? (' (в очереди ' + count + ')') : ''));
        } else {
            hideFunpayPublishingToast();
        }
    }

    function hidePersistentApiTokenToast() {
        const toast = document.querySelector('.rareTokenToast');
        if (toast) toast.classList.remove('show');
    }

    function showPersistentApiTokenToast(feature, invalidToken) {
        let toast = document.querySelector('.rareTokenToast');
        if (!toast) {
            toast = createNode('div', 'rareToast rareHintToast rareTokenToast is-error');
            toast.innerHTML = '<span class="rareToastCheck"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg></span><span class="rareHintToastText"><span class="rareHintToastTitle">API токен</span><span class="rareHintToastBody"></span><span class="rareHintToastActions"><button type="button" class="rareHintToastBtn is-accent rareTokenToastSettings">Открыть настройки</button></span></span><button type="button" class="rareHintToastClose" title="Закрыть">' + closeSvg() + '</button>';
            const closeBtn = toast.querySelector('.rareHintToastClose');
            const settingsBtn = toast.querySelector('.rareTokenToastSettings');
            if (closeBtn) closeBtn.addEventListener('click', hidePersistentApiTokenToast);
            if (settingsBtn) settingsBtn.addEventListener('click', () => openSettings(CATEGORIES.skins));
            mountToast(toast);
        }
        if (!toast._rareHintToastBody) toast._rareHintToastBody = toast.querySelector('.rareHintToastBody');
        toast.style.setProperty('--rare-toast-accent', '#ff5c5c');
        toast.style.setProperty('--rare-toast-accent-rgb', '255,92,92');
        toast.style.setProperty('--rare-toast-bg', '#1b0b0d');
        const body = toast._rareHintToastBody;
        if (body) body.textContent = (feature ? (feature + ' требует API токен. ') : 'Эта функция требует API токен. ')
            + (invalidToken
                ? 'Текущий токен недействителен или истёк: обнови токен в настройках или выключи эту функцию.'
                : 'Добавь или обнови токен в настройках, либо выключи эту функцию.');
        showToastEl(toast);
    }

    const HINT_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-4 12.75c.62.45 1 1.15 1 1.92V18h6v-1.33c0-.77.38-1.47 1-1.92A7 7 0 0 0 12 2Z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    const ERROR_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>';

    // Универсальный незакрываемый тост-уведомление с кнопкой «Понятно».
    // Закрывается ТОЛЬКО кнопкой (без авто-таймаута). opts:
    //   key    — уникальный ключ (один тост на ключ; не плодит дубли)
    //   title  — заголовок; body — текст; isError — красный стиль;
    //   onAck  — колбэк при нажатии «Понятно» (например dismissHint).
    function showNoticeToast(opts) {
        const o = opts || {};
        const key = o.key || 'notice';
        const cls = 'rareNoticeToast--' + key.replace(/[^a-z0-9_-]/gi, '');
        let toast = document.querySelector('.' + cls);
        if (!toast) {
            toast = createNode('div', 'rareToast rareHintToast rareNoticeToast ' + cls + (o.isError ? ' is-error' : ''));
            toast.innerHTML = '<span class="rareToastCheck">' + (o.isError ? ERROR_ICON_SVG : HINT_ICON_SVG) + '</span>'
                + '<span class="rareHintToastText"><span class="rareHintToastTitle"></span><span class="rareHintToastBody"></span></span>'
                + '<span class="rareHintToastActions"><button type="button" class="rareHintToastBtn is-accent">Понятно</button></span>';
            const okBtn = toast.querySelector('.rareHintToastBtn.is-accent');
            if (okBtn) okBtn.addEventListener('click', () => {
                clearTimeout(rareHintToastTimer);
                toast.classList.remove('show');
                if (typeof o.onAck === 'function') o.onAck();
            });
            mountToast(toast);
            toast._title = toast.querySelector('.rareHintToastTitle');
            toast._body = toast.querySelector('.rareHintToastBody');
        }
        toast.classList.toggle('is-error', !!o.isError);
        if (toast._title) toast._title.textContent = o.title || 'Уведомление';
        if (toast._body) toast._body.textContent = o.body || '';
        // Тема: ошибка — красная, иначе акцент панели.
        if (o.isError) {
            toast.style.setProperty('--rare-toast-accent', '#ff5c5c');
            toast.style.setProperty('--rare-toast-accent-rgb', '255,92,92');
            toast.style.setProperty('--rare-toast-bg', '#1b0b0d');
        } else {
            const theme = buildRareActionTheme();
            toast.style.setProperty('--rare-toast-accent', theme.tint);
            toast.style.setProperty('--rare-toast-accent-rgb', theme.tintRgb);
            toast.style.setProperty('--rare-toast-bg', theme.baseBg);
            toast.querySelectorAll('.rareHintToastBtn').forEach(btn => {
                btn.style.setProperty('border', '1px solid ' + theme.buttonPrimaryBorder, 'important');
                btn.style.setProperty('background', theme.buttonPrimaryBg, 'important');
                btn.style.setProperty('color', '#eef3f8', 'important');
                btn.style.setProperty('box-shadow', theme.buttonPrimaryShadow, 'important');
            });
        }
        clearTimeout(rareHintToastTimer);
        showToastEl(toast);
    }

    // Ценовая подсказка — теперь поверх универсального showNoticeToast.
    function showPriceHintToast() {
        if (isHintDismissed(PRICE_SEARCH_HINT_ID)) return;
        showNoticeToast({
            key: PRICE_SEARCH_HINT_ID,
            title: 'Подсказка',
            body: 'Минимальная и средняя цена скина/игры ищется с той же отлегой аккаунта, для Valorant также учтен регион аккаунта',
            onAck: () => dismissHint(PRICE_SEARCH_HINT_ID)
        });
    }

    function buildRareActionTheme() {
        const panelColor = (CUSTOM.panelColor || DEFAULT_CUSTOM.panelColor || '#9e8550').toLowerCase();
        const baseBg = CUSTOM.modalBg || DEFAULT_CUSTOM.modalBg || '#121916';
        const tint = panelColor === '#000000' ? '#5f6368' : shade(panelColor, 0.22);
        const tintRgb = hexToRgbList(tint);
        return {
            tint,
            tintRgb,
            baseBg,
            surfaceBg: 'linear-gradient(180deg,rgba(' + tintRgb + ',.13),rgba(' + tintRgb + ',.05)),' + baseBg,
            surfaceBorder: 'rgba(' + tintRgb + ',.44)',
            surfaceShadow: '0 10px 26px rgba(0,0,0,.3)',
            divider: 'rgba(' + tintRgb + ',.36)',
            buttonBg: 'linear-gradient(180deg,rgba(' + tintRgb + ',.18),rgba(' + tintRgb + ',.08)),' + baseBg,
            buttonBorder: 'rgba(' + tintRgb + ',.62)',
            buttonShadow: 'none',
            buttonPrimaryBg: 'linear-gradient(180deg,rgba(' + tintRgb + ',.28),rgba(' + tintRgb + ',.12)),' + baseBg,
            buttonPrimaryBorder: 'rgba(' + tintRgb + ',.78)',
            buttonPrimaryShadow: 'none',
            buttonHoverBg: 'linear-gradient(180deg,rgba(' + tintRgb + ',.24),rgba(' + tintRgb + ',.11)),' + baseBg,
            buttonHoverBorder: 'rgba(' + tintRgb + ',.80)'
        };
    }

    // Тематическое подтверждение (замена window.confirm), стиль берётся из панели настроек.
    function showRareConfirm(opts) {
        return new Promise(resolve => {
            const o = opts || {};
            const theme = buildRareActionTheme();
            const overlay = createNode('div', 'rareConfirmOverlay');
            const boxEl = createNode('div', 'rareConfirmBox');
            boxEl.style.background = theme.surfaceBg;
            boxEl.style.border = '1px solid ' + theme.surfaceBorder;
            boxEl.style.boxShadow = '0 20px 50px rgba(0,0,0,.45)';
            boxEl.innerHTML = '<p class="rareConfirmTitle"></p><p class="rareConfirmBody"></p>'
                + '<div class="rareConfirmActions"><button type="button" class="rareConfirmBtn rareConfirmBtnGhost rareConfirmCancel"></button>'
                + '<button type="button" class="rareConfirmBtn rareConfirmBtnDanger rareConfirmOk"></button></div>';
            boxEl.querySelector('.rareConfirmTitle').textContent = o.title || 'Подтвердите действие';
            boxEl.querySelector('.rareConfirmBody').textContent = o.body || '';
            const cancelBtn = boxEl.querySelector('.rareConfirmCancel');
            const okBtn = boxEl.querySelector('.rareConfirmOk');
            cancelBtn.textContent = o.cancelText || 'Отмена';
            okBtn.textContent = o.okText || 'Удалить';
            okBtn.style.background = 'linear-gradient(180deg,#ff6b6b,#e14b4b)';
            okBtn.style.border = '1px solid rgba(255,92,92,.7)';
            overlay.appendChild(boxEl);
            document.body.appendChild(overlay);
            requestAnimationFrame(() => overlay.classList.add('show'));
            let done = false;
            const finish = (result) => {
                if (done) return;
                done = true;
                document.removeEventListener('keydown', onKeyDown, true);
                overlay.classList.remove('show');
                setTimeout(() => overlay.remove(), 140);
                resolve(result);
            };
            const onKeyDown = (e) => {
                if (e.key === 'Escape') { e.preventDefault(); finish(false); }
                else if (e.key === 'Enter') { e.preventDefault(); finish(true); }
            };
            document.addEventListener('keydown', onKeyDown, true);
            overlay.addEventListener('click', (e) => { if (e.target === overlay) finish(false); });
            cancelBtn.addEventListener('click', () => finish(false));
            okBtn.addEventListener('click', () => finish(true));
        });
    }

    function applyThemeHoverMenu(menu) {
        if (!menu) return;
        const theme = buildRareActionTheme();
        menu.style.setProperty('background', theme.surfaceBg);
        menu.style.setProperty('border-color', theme.surfaceBorder);
        menu.style.setProperty('box-shadow', theme.surfaceShadow);
        const divider = menu.querySelector('.rareHoverMenuDivider');
        if (divider) divider.style.setProperty('background', theme.divider);
        const buttons = menu.querySelectorAll('.rareHoverMenuBtn');
        buttons.forEach((btn, index) => {
            btn.style.setProperty('appearance', 'none', 'important');
            btn.style.setProperty('-webkit-appearance', 'none', 'important');
            btn.style.setProperty('background', theme.buttonBg, 'important');
            btn.style.setProperty('color', '#eef3f8', 'important');
            btn.style.setProperty('border', 'none', 'important');
            const baseShadow = 'none';
            const hoverShadow = 'none';
            btn._rareHoverMenuTheme = {
                buttonBg: theme.buttonBg,
                buttonHoverBg: theme.buttonHoverBg,
                baseShadow,
                hoverShadow
            };
            btn.style.setProperty('box-shadow', baseShadow, 'important');
            if (btn.dataset.rareHoverMenuBound !== '1') {
                btn.dataset.rareHoverMenuBound = '1';
                btn.addEventListener('mouseenter', () => {
                    const currentTheme = btn._rareHoverMenuTheme;
                    btn.style.setProperty('background', currentTheme ? currentTheme.buttonHoverBg : theme.buttonHoverBg, 'important');
                    btn.style.setProperty('box-shadow', currentTheme ? currentTheme.hoverShadow : hoverShadow, 'important');
                    btn.style.setProperty('color', '#fff', 'important');
                });
                btn.addEventListener('mouseleave', () => {
                    const currentTheme = btn._rareHoverMenuTheme;
                    btn.style.setProperty('background', currentTheme ? currentTheme.buttonBg : theme.buttonBg, 'important');
                    btn.style.setProperty('box-shadow', currentTheme ? currentTheme.baseShadow : baseShadow, 'important');
                    btn.style.setProperty('color', '#eef3f8', 'important');
                });
            }
        });
    }

    function refreshPanelColorDependentUi() {
        document.querySelectorAll('.rareHoverMenu').forEach(menu => applyThemeHoverMenu(menu));
        const theme = buildRareActionTheme();
        document.querySelectorAll('.rarePricePlate').forEach(plate => {
            plate.style.setProperty('background', theme.surfaceBg);
            plate.style.setProperty('border-color', theme.surfaceBorder);
            plate.style.setProperty('box-shadow', theme.surfaceShadow);
            plate.style.setProperty('--rare-price-accent-rgb', theme.tintRgb);
        });
        document.querySelectorAll('.rareSteamGear').forEach(gear => {
            if (gear.matches(':hover') || gear.matches(':focus-within')) {
                const panelColor = CUSTOM.panelColor || DEFAULT_CUSTOM.panelColor;
                const panelRgb = hexToRgbList(panelColor);
                gear.style.background = 'rgba(' + panelRgb + ',0.10)';
                gear.style.borderColor = 'rgba(' + panelRgb + ',0.24)';
                gear.style.boxShadow = 'none';
                gear.style.color = panelColor;
            }
        });
    }

    function ensurePricePlate(hostCard) {
        bindPricePlateListeners();
        let plate = hostCard && hostCard.__rarePricePlate;
        if (plate && document.body.contains(plate)) return plate;
        plate = createNode('div', 'rarePricePlate');
        plate.__rareHostCard = hostCard || null;
        document.body.appendChild(plate);
        if (hostCard) hostCard.__rarePricePlate = plate;
        return plate;
    }

    function placePricePlate(hostCard, plate) {
        if (!hostCard || !plate) return;
        const rect = hostCard.getBoundingClientRect();
        const plateRect = plate.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft || 0;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        const left = Math.round(scrollX + rect.left + rect.width / 2 - plateRect.width / 2);
        const top = Math.round(scrollY + rect.top - plateRect.height - 20);
        const minLeft = scrollX + 8;
        const maxLeft = scrollX + window.innerWidth - plateRect.width - 8;
        plate.style.left = Math.max(minLeft, Math.min(left, maxLeft)) + 'px';
        plate.style.top = Math.max(scrollY + 8, top) + 'px';
        plate.style.transform = 'translate3d(0,0,0)';
    }

    function syncVisiblePricePlates() {
        document.querySelectorAll('.rarePricePlate.show').forEach(plate => {
            const hostCard = plate.__rareHostCard;
            if (!hostCard || !document.body.contains(hostCard)) plate.classList.remove('show');
        });
        document.querySelectorAll('.rareHoverGlow').forEach(card => {
            if (!card.__rarePricePlateVisible || !card.__rarePricePlate || !card.__rarePricePlate.classList.contains('show')) return;
            placePricePlate(card, card.__rarePricePlate);
        });
    }

    function showPricePlate(hostCard) {
        const plate = hostCard && hostCard.__rarePricePlate;
        if (!plate) return;
        hostCard.__rarePricePlateVisible = true;
        placePricePlate(hostCard, plate);
        plate.classList.add('show');
    }

    function hidePricePlate(hostCard) {
        const plate = hostCard && hostCard.__rarePricePlate;
        if (!plate) return;
        hostCard.__rarePricePlateVisible = false;
        plate.classList.remove('show');
    }

    function levelForDays(n) {
        const sorted = ACT_LEVELS.slice().sort((a, b) => a.min - b.min);
        for (const lvl of sorted) {
            const okMin = n >= lvl.min;
            const okMax = (lvl.max === null) ? true : n < lvl.max;
            if (okMin && okMax) return lvl;
        }
        return sorted[sorted.length - 1] || { color: '#00ba78', effect: 'none' };
    }

    function norm(str) {
        return (str || '').replace(/\u00a0/g, ' ').replace(/[«»""„‟]/g, '"').replace(/\s+/g, ' ').trim().toLowerCase();
    }
    const escHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    function getItemName(li) {
        const gameTitle = li.querySelector('.gameTitle');
        if (gameTitle) return gameTitle.textContent;
        const gameName = li.querySelector('.gameItem--name');
        if (gameName) return gameName.textContent;
        const cont = li.querySelector('.bottomContainer');
        if (cont) return cont.textContent;
        const img = li.querySelector('img[alt]');
        return img ? img.getAttribute('alt') : '';
    }
    function normalizeWantedText(value) {
        return norm(String(value || '')
            .replace(/ё/g, 'е')
            .replace(/["'`]/g, '')
            .replace(/[«»]/g, '')
            .replace(/[()\[\]{}]/g, ' ')
            .replace(/[._,+\-/:;|\\]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim());
    }
    function matchWanted(name, cat) {
        const n = normalizeWantedText(name);
        return cat.wanted.find(w => {
            const wn = normalizeWantedText(w.name);
            if (!wn) return false;
            return n === wn;
        }) || null;
    }

    function findLolSkinLists() {
        const lists = [];
        document.querySelectorAll('.marketItemView--gamesContainer.lolItems ul.body, .lolItems ul.body').forEach(ul => {
            if (ul.closest('#rareLolPanel') || ul.closest('.rareBucket')) return;
            const anchor = ul.closest('.marketItemView--gamesContainer') || ul;
            const heading = findHeadingBefore(anchor);
            const headingText = norm(heading && heading.textContent);
            if (headingText.includes(norm('скинов'))) lists.push(ul);
        });
        return lists;
    }

    const pluralRareSkins    = n => pluralizeRu(n, ['редкий скин',   'редких скина',   'редких скинов']);
    const pluralRareItems    = n => pluralizeRu(n, ['редкий предмет','редких предмета', 'редких предметов']);
    const pluralValuableGames= n => pluralizeRu(n, ['ценная игра',   'ценные игры',    'ценных игр']);
    const pluralRareMedals   = n => pluralizeRu(n, ['редкая медаль', 'редкие медали',  'редких медалей']);
    const pluralPlainItems   = n => pluralizeRu(n, ['предмет',       'предмета',       'предметов']);
    const pluralBrawlers     = n => pluralizeRu(n, ['боец',          'бойца',          'бойцов']);
    const NO_RARE_ITEMS_TEXT = 'Редкого не найдено';

    function hexToRgba(hex, a) {
        const h = hex.replace('#', '');
        return 'rgba(' + parseInt(h.substring(0,2),16) + ',' + parseInt(h.substring(2,4),16) + ',' + parseInt(h.substring(4,6),16) + ',' + a + ')';
    }
    function shade(hex, pct) {
        const h = hex.replace('#', '');
        let r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
        if (pct >= 0) { r = Math.round(r + (255 - r) * pct); g = Math.round(g + (255 - g) * pct); b = Math.round(b + (255 - b) * pct); }
        else { r = Math.round(r * (1 + pct)); g = Math.round(g * (1 + pct)); b = Math.round(b * (1 + pct)); }
        const toHex = (n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }
    function hexToRgbList(hex) {
        const h = hex.replace('#', '');
        return parseInt(h.substring(0,2),16) + ',' + parseInt(h.substring(2,4),16) + ',' + parseInt(h.substring(4,6),16);
    }
    function getReadableTextColor(bg) {
        const h = String(bg || '').replace('#', '');
        if (h.length !== 6) return '#f3f7fb';
        const r = parseInt(h.substring(0,2), 16);
        const g = parseInt(h.substring(2,4), 16);
        const b = parseInt(h.substring(4,6), 16);
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return luminance > 0.52 ? '#13202b' : '#f3f7fb';
    }
    function getThemeAccentForeground(accent, bg) {
        const accentHex = String(accent || '').trim();
        const bgHex = String(bg || '').trim();
        if (!/^#[0-9a-f]{6}$/i.test(accentHex)) return getReadableTextColor(bgHex);
        if (!/^#[0-9a-f]{6}$/i.test(bgHex)) return accentHex;
        const ah = accentHex.replace('#', '');
        const bh = bgHex.replace('#', '');
        const ar = parseInt(ah.substring(0, 2), 16);
        const ag = parseInt(ah.substring(2, 4), 16);
        const ab = parseInt(ah.substring(4, 6), 16);
        const br = parseInt(bh.substring(0, 2), 16);
        const bgc = parseInt(bh.substring(2, 4), 16);
        const bb = parseInt(bh.substring(4, 6), 16);
        const accentLum = (0.2126 * ar + 0.7152 * ag + 0.0722 * ab) / 255;
        const bgLum = (0.2126 * br + 0.7152 * bgc + 0.0722 * bb) / 255;
        const diff = Math.abs(accentLum - bgLum);
        if (diff >= 0.28) return accentHex;
        return bgLum > 0.52 ? shade(accentHex, -0.32) : shade(accentHex, 0.22);
    }
    function muteColor(color, amount) {
        const m = amount == null ? 0.18 : amount;
        const rgba = color.match(/^rgba?\(([^)]+)\)$/i);
        if (rgba) {
            const parts = rgba[1].split(',').map(s => s.trim());
            if (parts.length < 3) return color;
            const alpha = parts[3] != null ? parseFloat(parts[3]) : null;
            const src = parts.slice(0, 3).map(n => Math.max(0, Math.min(255, parseFloat(n) || 0)));
            const gray = (src[0] + src[1] + src[2]) / 3;
            const next = src.map(v => Math.round((v + (gray - v) * m) * (1 - m)));
            return alpha == null ? `rgb(${next[0]}, ${next[1]}, ${next[2]})` : `rgba(${next[0]}, ${next[1]}, ${next[2]}, ${alpha})`;
        }
        if (/^#([0-9a-f]{6})$/i.test(color)) {
            return shade(saturate(color, -m), -m);
        }
        return color;
    }
    function saturate(hex, pct) {
        const h = hex.replace('#', '');
        let r = parseInt(h.substring(0,2),16) / 255;
        let g = parseInt(h.substring(2,4),16) / 255;
        let b = parseInt(h.substring(4,6),16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let hh = 0, ss = 0;
        const ll = (max + min) / 2;
        const d = max - min;
        if (d !== 0) {
            ss = d / (1 - Math.abs(2 * ll - 1));
            switch (max) {
                case r: hh = ((g - b) / d + (g < b ? 6 : 0)); break;
                case g: hh = ((b - r) / d + 2); break;
                default: hh = ((r - g) / d + 4); break;
            }
            hh /= 6;
        }
        ss = Math.max(0, Math.min(1, ss * (1 + pct)));
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        if (ss !== 0) {
            const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
            const p = 2 * ll - q;
            r = hue2rgb(p, q, hh + 1 / 3);
            g = hue2rgb(p, q, hh);
            b = hue2rgb(p, q, hh - 1 / 3);
        } else {
            r = g = b = ll;
        }
        const toHex = (n) => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, '0');
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }
    function fireShadow(color) {
        const c1 = shade(color, 0.55), c2 = color, c3 = shade(color, -0.2), c4 = shade(color, -0.45);
        return '0 0 2px #fff,0 -1px 2px ' + c1 + ',0 -1px 4px ' + c2 + ',0 -2px 6px ' + c2 + ',0 -2px 9px ' + c3 + ',0 -3px 13px ' + c4;
    }
    function dollarSvg() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="22"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>';
    }
    function priceTagSvg() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 11 23l-9-9V3h11l9.59 9.59a2 2 0 0 1 0 2.82Z"></path><path d="M7 7h.01"></path></svg>';
    }
    function externalLinkSvg() {
        return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"></path><path d="M10 14 21 3"></path><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path></svg>';
    }
    const findRareFxParticles = (host) => host && host.querySelector ? host.querySelector(':scope > .rareFxParticles') : null;
    function removeRareFxParticles(host) {
        const layer = findRareFxParticles(host);
        if (layer && layer.parentNode) layer.parentNode.removeChild(layer);
    }
    function ensureRareFxParticles(host, color) {
        if (!host) return;
        let layer = findRareFxParticles(host);
        if (!layer) {
            layer = createNode('span', 'rareFxParticles');
            [
                ['12', '18', '0.73', '11', '1.8', '0.0'],
                ['82', '22', '0.90', '9', '2.3', '-0.6'],
                ['70', '74', '0.80', '13', '2.1', '-1.1'],
                ['24', '80', '0.65', '8', '1.7', '-0.9'],
                ['50', '8', '0.75', '10', '2.6', '-1.4'],
                ['52', '90', '0.85', '12', '2.0', '-0.3']
            ].forEach(([x, y, alpha, size, duration, delay]) => {
                const p = createNode('span', 'rareFxParticle');
                p.style.setProperty('--x', x);
                p.style.setProperty('--y', y);
                p.style.setProperty('--alpha', alpha);
                p.style.setProperty('--size', size + 'px');
                p.style.setProperty('--duration', duration + 's');
                p.style.setProperty('--delay', delay + 's');
                p.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 14.7 9.3 22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z"></path></svg>';
                layer.appendChild(p);
            });
            host.appendChild(layer);
        }
        layer.style.setProperty('--rare-particle-rgb', hexToRgbList(color));
    }
    function applyCardEffect(target, color, effect, options) {
        if (!target) return;
        const opts = options || {};
        const baseShadow = opts.baseShadow || '';
        const outerGlowAlpha = opts.outerGlowAlpha == null ? 0.24 : opts.outerGlowAlpha;
        const outerShimmerAlpha = opts.outerShimmerAlpha == null ? 0.28 : opts.outerShimmerAlpha;
        const shimmerHost = opts.shimmerHost || target;
        shimmerHost.classList.remove('rareFxShimmer');
        shimmerHost.style.removeProperty('--rare-shimmer-radius');
        removeRareFxParticles(shimmerHost);
        const enableParticles = opts.enableParticles !== false;
        target.style.removeProperty('box-shadow');
        if (effect === 'glow') {
            target.style.setProperty('box-shadow', (baseShadow ? baseShadow + ',' : '') + '0 0 14px ' + hexToRgba(color, outerGlowAlpha), 'important');
            if (enableParticles) ensureRareFxParticles(shimmerHost, color);
        } else if (effect === 'fire') {
            target.style.setProperty('box-shadow', (baseShadow ? baseShadow + ',' : '') + fireShadow(color), 'important');
            if (enableParticles) ensureRareFxParticles(shimmerHost, color);
        } else if (effect === 'shimmer') {
            target.style.setProperty('box-shadow', (baseShadow ? baseShadow + ',' : '') + '0 0 16px ' + hexToRgba(color, outerShimmerAlpha), 'important');
            shimmerHost.classList.add('rareFxShimmer');
            if (opts.shimmerRadius) shimmerHost.style.setProperty('--rare-shimmer-radius', opts.shimmerRadius);
            if (enableParticles) ensureRareFxParticles(shimmerHost, color);
        } else if (effect === 'blink') {
            if (enableParticles) ensureRareFxParticles(shimmerHost, color);
        } else if (baseShadow) {
            target.style.setProperty('box-shadow', baseShadow, 'important');
        }
    }
    const hoverLabelRegistry = new Set();

    function bindScrollResizeOnce(boundFlag, handler) {
        if (boundFlag.v) return;
        window.addEventListener('scroll', handler, true);
        window.addEventListener('resize', handler);
        boundFlag.v = true;
    }
    const _hoverLabelBound = { v: false };
    const _pricePlateBound = { v: false };
    function bindHoverLabelListeners() {
        bindScrollResizeOnce(_hoverLabelBound, () => hoverLabelRegistry.forEach(entry => {
            if (!entry || !entry.visible) return;
            const r = entry.card.getBoundingClientRect();
            entry.label.style.left = Math.round(r.left + r.width / 2) + 'px';
            entry.label.style.top = Math.round(r.top - 8) + 'px';
        }));
    }
    const bindPricePlateListeners = () => bindScrollResizeOnce(_pricePlateBound, syncVisiblePricePlates);
    function marketCsgoSvg() {
        return '<svg viewBox="0 0 600 600" aria-hidden="true"><g transform="translate(0,600) scale(0.1,-0.1)" fill="currentColor" stroke="none"><path d="M2685 5914 c-238 -16 -580 -60 -770 -100 -498 -106 -961 -247 -1370 -416 l-130 -54 -3 -637 -2 -637 190 0 190 0 2 501 3 500 105 40 c146 55 414 144 480 159 30 6 91 23 135 36 229 68 618 148 890 184 357 46 776 48 1095 5 63 -9 151 -20 195 -26 327 -40 965 -205 1405 -363 l95 -34 5 -498 5 -499 193 -3 192 -2 -2 636 -3 636 -135 55 c-230 92 -515 188 -760 257 -691 192 -1081 254 -1645 260 -165 2 -327 2 -360 0z"></path><path d="M2275 4419 c-126 -7 -307 -34 -378 -55 -15 -5 -9 -12 28 -35 54 -34 135 -113 135 -131 0 -7 -16 -24 -36 -37 -57 -39 -206 -203 -267 -293 -101 -151 -175 -319 -207 -473 -72 -343 -37 -692 96 -958 164 -324 439 -556 804 -675 463 -151 1138 -63 1465 191 131 102 315 308 395 442 88 149 153 327 175 480 17 119 19 295 4 437 -11 108 -73 374 -109 468 -58 153 -251 501 -291 525 -9 6 -11 4 -6 -8 3 -8 9 -33 12 -54 4 -21 17 -90 31 -154 13 -64 28 -168 35 -230 14 -147 14 -419 0 -535 -13 -106 -57 -259 -105 -359 -67 -143 -214 -343 -315 -431 -44 -38 -160 -114 -175 -114 -6 0 -18 -5 -26 -10 -12 -7 -11 -13 10 -36 34 -37 156 -126 208 -153 23 -12 42 -26 42 -31 0 -26 -238 -124 -405 -167 -104 -27 -121 -28 -330 -28 -218 0 -221 0 -345 33 -131 35 -297 104 -405 168 l-65 39 0 70 c0 158 43 411 95 563 41 120 59 166 65 172 3 3 20 36 39 74 53 106 204 296 235 296 20 0 153 -140 189 -198 l33 -53 55 44 c106 87 229 252 299 402 54 117 112 322 138 487 l9 57 -52 35 c-181 120 -472 218 -686 230 -214 13 -248 13 -394 5z"></path><path d="M410 1856 l0 -664 58 -22 c31 -13 62 -27 67 -31 6 -3 73 -34 150 -67 77 -33 195 -85 262 -116 67 -31 125 -56 128 -56 2 0 55 -24 117 -53 104 -49 209 -96 408 -182 41 -18 152 -67 245 -109 94 -42 199 -90 235 -106 36 -16 164 -74 285 -128 121 -55 261 -117 310 -137 50 -21 141 -62 204 -92 62 -29 118 -53 123 -53 5 0 37 13 71 29 34 16 125 57 202 91 77 34 210 94 295 132 85 39 178 80 205 93 28 12 88 39 135 60 77 33 295 131 425 190 28 12 111 50 185 83 74 33 203 90 285 127 83 37 175 78 205 92 69 31 395 177 475 212 33 15 70 32 83 39 l22 13 0 659 0 660 -192 0 -193 0 3 -502 c2 -277 0 -517 -3 -535 -5 -27 -13 -34 -68 -57 -143 -58 -207 -86 -297 -128 -162 -77 -404 -186 -428 -193 -13 -4 -128 -55 -255 -114 -128 -59 -272 -125 -322 -146 -49 -20 -198 -87 -330 -148 -242 -111 -424 -190 -481 -209 -27 -9 -42 -6 -110 25 -43 19 -117 51 -164 72 -95 41 -477 213 -557 250 -36 17 -53 21 -53 12 -1 -8 -5 -7 -13 4 -12 15 -366 181 -562 264 -55 23 -203 89 -330 147 -126 58 -277 125 -335 150 l-105 44 -3 532 -2 532 -190 0 -190 0 0 -664z"></path></g></svg>';
    }
    function valorantPlayLogoSvg() {
        return '<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M19.8 26.1h-.2c-2.4 0-4.8 0-7.2 0-.3 0-.5-.1-.6-.3-2.5-3.2-5.1-6.3-7.6-9.5-.1-.2-.2-.3-.2-.5 0-3.1 0-6.1 0-9.2 0-.1 0-.2.1-.2h.1c5.2 6.5 10.4 13 15.5 19.5 0 0 0 .1.1.1z"></path><path d="M27.8 16.3c-.7.9-1.5 1.8-2.2 2.8-.2.2-.4.3-.6.3-2.4 0-4.8 0-7.1 0 0 0-.1 0-.1 0-.1 0-.2-.1-.1-.2 0 0 0-.1.1-.1 2.4-3 4.7-5.9 7.1-8.9 1-1.2 2-2.5 2.9-3.7 0-.1.1-.1.2-.1 0 0 .1 0 .1 0 0 .1 0 .1 0 .2 0 3 0 6.1 0 9.1 0 .3-.1.5-.2.6z"></path></svg>';
    }
    function leagueLogoSvg() {
        return '<svg viewBox="0 0 448 453" aria-hidden="true"><g transform="translate(0,453) scale(0.1,-0.1)" fill="currentColor" stroke="none"><path d="M789 4482 c-26 -23 -32 -36 -32 -70 0 -38 13 -59 152 -243 l151 -202 0 -1706 0 -1705 -205 -206 c-167 -168 -205 -211 -205 -234 0 -34 16 -66 44 -88 20 -16 116 -18 1546 -18 l1524 0 278 277 c181 181 282 288 288 309 12 37 2 70 -30 99 -22 20 -40 20 -1119 25 l-1096 5 -5 1868 -5 1869 -28 24 -28 24 -599 0 -600 0 -31 -28z"></path><path d="M2360 3967 l0 -134 113 -6 c763 -41 1428 -622 1601 -1398 111 -496 6 -1032 -281 -1437 l-44 -62 160 0 159 0 37 58 c63 99 153 294 195 421 173 526 131 1086 -117 1573 -264 519 -750 910 -1310 1054 -149 38 -327 64 -439 64 l-74 0 0 -133z"></path><path d="M662 3505 c-421 -406 -650 -1008 -604 -1592 41 -510 256 -976 608 -1313 l89 -85 3 155 c2 142 1 156 -18 180 -121 152 -256 403 -317 590 -136 415 -136 813 -2 1225 63 192 198 444 319 595 19 24 20 37 18 180 l-3 155 -93 -90z"></path></g></svg>';
    }
    function appendHoverMenu(card, opts) {
        if (!card || card.querySelector('.rareHoverMenu')) return;
        const o = opts || {};
        if (!o.onPriceClick && !o.externalHref) return;
        if (o.priceMeta) {
            card.__rarePriceMeta = o.priceMeta;
            const cached = getCachedItemPrice(o.priceMeta);
            if (cached) {
                card.__rarePriceStats = { meta: o.priceMeta, stats: cached.stats, savedAt: cached.savedAt };
                renderPricePlate(card, 'ready', card.__rarePriceStats);
            }
            card.addEventListener('mouseenter', () => {
                const saved = card.__rarePriceStats;
                if (saved && saved.stats) renderPricePlate(card, 'ready', saved);
                showPricePlate(card);
            });
            card.addEventListener('mouseleave', () => hidePricePlate(card));
        }
        const menu = createNode('div', 'rareHoverMenu');
        const left = createNode(o.onPriceClick ? 'button' : 'span', 'rareHoverMenuBtn');
        left.innerHTML = dollarSvg();
        if (o.priceTitle) left.title = o.priceTitle;
        if (o.onPriceClick) {
            left.type = 'button';
            left.setAttribute('aria-label', o.priceTitle || 'Показать цену');
            left.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                o.onPriceClick(card, left);
            });
        } else {
            left.setAttribute('aria-hidden', 'true');
        }
        menu.appendChild(left);
        menu.appendChild(createNode('span', 'rareHoverMenuDivider'));
        const rightTag = o.externalHref ? 'a' : 'span';
        const right = createNode(rightTag, 'rareHoverMenuBtn');
        right.innerHTML = externalLinkSvg();
        right.title = o.externalTitle || 'Открыть на маркете';
        if (o.externalHref) {
            right.setAttribute('aria-label', o.externalTitle || 'Открыть на маркете');
            right.href = o.externalHref;
            right.target = '_blank';
            right.rel = 'nofollow noopener noreferrer';
            right.addEventListener('click', (e) => e.stopPropagation());
        } else {
            right.setAttribute('aria-hidden', 'true');
        }
        menu.appendChild(right);
        applyThemeHoverMenu(menu);
        card.appendChild(menu);
    }
    function appendHoverLabel(card, text) {
        if (!card || !text || card.__rareHoverLabel) return;
        bindHoverLabelListeners();
        const label = createNode('div', 'rareHoverLabel', String(text).toUpperCase());
        document.body.appendChild(label);
        card.__rareHoverLabel = label;
        const entry = { card, label, visible: false };
        hoverLabelRegistry.add(entry);
        function placeLabel() {
            const r = card.getBoundingClientRect();
            label.style.left = Math.round(r.left + r.width / 2) + 'px';
            label.style.top = Math.round(r.top - 8) + 'px';
        }
        card.addEventListener('mouseenter', () => {
            placeLabel();
            label.classList.add('visible');
            entry.visible = true;
        });
        card.addEventListener('mousemove', placeLabel);
        card.addEventListener('mouseleave', () => {
            label.classList.remove('visible');
            entry.visible = false;
        });
        card.__rareHoverLabelCleanup = () => {
            hoverLabelRegistry.delete(entry);
            if (label.parentNode) label.parentNode.removeChild(label);
            card.__rareHoverLabel = null;
        };
    }
    function applyLevelStyle(el, color, effect) {
        el.style.animation = '';
        el.style.textShadow = '';
        el.style.backgroundImage = '';
        el.style.backgroundSize = '';
        el.style.backgroundPosition = '';
        el.style.backgroundRepeat = '';
        el.style.webkitBackgroundClip = '';
        el.style.backgroundClip = '';
        el.style.fontWeight = '700';
        el.style.lineHeight = 'inherit';
        el.style.padding = '0 3px';
        el.style.marginTop = '0';
        el.style.marginBottom = '0';
        el.style.verticalAlign = 'baseline';
        if (el.parentElement) el.parentElement.style.setProperty('overflow', 'visible', 'important');
        const counter = el.closest && el.closest('.counter');
        if (counter) counter.style.setProperty('overflow', 'visible', 'important');
        el.style.setProperty('color', color, 'important');
        if (effect === 'glow') {
            el.style.textShadow = '0 0 5.2px ' + hexToRgba(color, 0.9) + ',0 0 9.2px ' + hexToRgba(color, 0.6);
        } else if (effect === 'fire') {
            el.style.setProperty('color', shade(color, 0.7), 'important');
            el.style.fontWeight = '800';
            el.style.textShadow = fireShadow(color);
        }
    }

    function applyRareItemEffect(item, color, effect, isFortnite) {
        const target = isFortnite ? item.querySelector('img:first-of-type') : item;
        if (!target) return;
        target.style.removeProperty('animation');
        applyCardEffect(target, color, effect, { shimmerHost: item, ...DEFAULT_CARD_FX });
    }

    // ─── CSS секции ──────────────────────────────────────────────────────────────
    const _CSS_ITEMS = `
            .rareItem { --rare-shimmer-radius:10px; border-width:2px!important;border-style:solid!important;border-radius:10px!important;box-sizing:border-box!important;position:relative!important;isolation:isolate!important; }
            .rareFortniteItem { border-width:0!important;border-style:none!important;border-color:transparent!important;box-shadow:none!important;position:relative; }
            .rareFortniteItem img:first-of-type { outline:2px solid var(--rare-color,#ffce14)!important;outline-offset:-2px!important;border-radius:10px!important;box-shadow:none!important;position:relative;z-index:2; }
            .rareFxShimmer { --rare-shimmer-border:2.4px; --rare-shimmer-radius:10px; }
            .rareFxShimmer > * { position:relative;z-index:2; }
            .rareFxParticles { position:absolute;inset:-10px;pointer-events:none;overflow:visible;z-index:5; }
            .rareFxParticle { position:absolute;left:calc(var(--x) * 1%);top:calc(var(--y) * 1%);width:var(--size,10px);height:var(--size,10px);margin-left:calc(var(--size,10px) * -0.5);margin-top:calc(var(--size,10px) * -0.5);opacity:var(--alpha,.75);animation:rareFxParticleOrbit calc(var(--duration,2s) * 2.25) linear infinite;animation-delay:var(--delay,0s);transform-origin:center center;color:color-mix(in srgb, rgb(var(--rare-particle-rgb,255,255,255)) 52%, #fff 48%);filter:drop-shadow(0 0 12px rgba(var(--rare-particle-rgb,255,255,255),.82)) drop-shadow(0 0 24px rgba(var(--rare-particle-rgb,255,255,255),.5)); }
            .rareFxParticle:nth-of-type(even) { animation-direction:reverse; }
            .rareFxParticle svg { width:100%;height:100%;display:block;overflow:visible!important; }
            .rareFxParticle path { fill:currentColor;stroke:none; }
            .rareHoverGlow { position:relative;overflow:visible;z-index:3;transition:filter .25s ease,transform .12s; }
            .rareHoverGlow::after { content:'';position:absolute;left:0;top:0;width:100%;height:100%;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .35s ease;background:radial-gradient(412px circle at var(--mouse-x,50%) var(--mouse-y,50%), rgba(255,255,255,.055), transparent 42%);z-index:4; }
            .rareHoverGlow:hover { filter:brightness(1.05) saturate(1.14);border-color:var(--rare-color,#fff)!important;transform:translateY(-2px); }
            .rareHoverGlow:hover::after { opacity:1; }
            .rareHoverMenu { position:absolute;left:50%;top:0;transform:translate(-50%,-50%);display:flex;align-items:stretch;padding:0;background:rgba(17,19,23,.78);border:1px solid rgba(255,255,255,.12);border-radius:10px;overflow:visible;box-shadow:0 10px 26px rgba(0,0,0,.3);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .14s ease,visibility .14s ease;background-clip:padding-box;z-index:1002; }
            .rareHoverGlow:hover .rareHoverMenu, .rareHoverMenu:hover { opacity:1;visibility:visible;pointer-events:auto;transform:translate(-50%,-50%); }
            .rareHoverLabel { position:fixed;left:0;top:0;transform:translate(-50%,-100%);display:inline-block;inline-size:max-content;max-width:min(340px,calc(100vw - 24px));padding:10px 14px;background:rgba(17,19,23,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.12);border-radius:10px;box-shadow:0 10px 26px rgba(0,0,0,.3);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .14s ease,visibility .14s ease;z-index:999999;color:#edf0f4;font-size:12px;font-weight:700;line-height:1.3;text-align:center;text-wrap:pretty;white-space:normal;overflow:visible;text-transform:uppercase; }
            .rareHoverLabel.visible { opacity:1;visibility:visible; }
            .rareHoverMenuDivider { width:1px;align-self:stretch;background:rgba(255,255,255,.1);flex:0 0 auto; }
            .rareHoverMenuBtn { width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;border:none;background:transparent;color:rgba(237,240,244,.82);border-radius:0;cursor:pointer;text-decoration:none;transition:background .14s ease,color .14s ease,box-shadow .18s ease,border-color .18s ease; }
            .rareHoverMenuBtn:first-child { border-radius:9px 0 0 9px; }
            .rareHoverMenuBtn:last-child { border-radius:0 9px 9px 0; }
            .rareHoverMenuBtn:only-child { border-radius:9px; }
            .rareHoverMenuBtn:hover { background:rgba(255,255,255,.08);color:#fff;transform:none; }
            .rareHoverMenuBtn svg { width:18px;height:18px;display:block; }
            .rareFortniteSourceAddMenu { position:fixed;left:0;top:0;transform:translate(-50%,-50%);display:flex;align-items:stretch;padding:0;background:rgba(17,19,23,.78);border:1px solid rgba(255,255,255,.12);border-radius:10px;overflow:visible;box-shadow:0 10px 26px rgba(0,0,0,.3);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .14s ease,visibility .14s ease;background-clip:padding-box;z-index:2147483647; }
            .rareFortniteSourceAddMenu.show, .rareFortniteSourceAddMenu:hover { opacity:1;visibility:visible;pointer-events:auto;transform:translate(-50%,-50%); }
            .rareFortniteSourceAddBtn { width:31px;height:31px; }
            .rareFortniteSourceAddBtn svg { width:15px;height:15px; }
            .rareHoverGlow.rarePriceEnabled:hover { z-index:1001!important; }
            .rarePricePlate { position:absolute;left:0;top:0;transform:translate3d(-9999px,-9999px,0);width:max-content;min-width:154px;max-width:230px;min-height:118px;display:flex;flex-direction:column;background:rgba(0,0,0,.98);border:1px solid rgba(255,255,255,.12);border-radius:10px;overflow:hidden;box-shadow:0 10px 26px rgba(0,0,0,.3);background-clip:padding-box;z-index:1000004;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .14s ease,visibility .14s ease;font-family:"Open Sans",Arial,sans-serif; }
            .rarePricePlate.show { opacity:1;visibility:visible; }
            .rarePricePlateHead { display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 10px;border-bottom:1px solid rgba(var(--rare-price-accent-rgb,158,133,80),.40);font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:rgba(237,240,244,.78);text-align:center; }
            .rarePricePlateHeadIcon { width:14px;height:14px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;color:rgba(237,240,244,.78); }
            .rarePricePlateHeadIcon svg { width:14px;height:14px;display:block;stroke:currentColor;fill:none; }
            .rarePricePlateBody { display:flex;flex-direction:column;gap:6px;padding:9px 10px; }
            .rarePricePlateRow { display:flex;align-items:baseline;justify-content:space-between;gap:14px;font-size:13px;color:#eff2f6; }
            .rarePricePlateKey { color:rgba(237,240,244,.6);font-size:12px;font-weight:600;text-transform:none;letter-spacing:0; }
            .rarePricePlateValue { font-weight:700;font-variant-numeric:tabular-nums; }
            .rarePricePlateValue.is-price { color:#eff2f6; }
            .rarePricePlateWarning { margin-top:4px;padding-top:8px;border-top:1px solid rgba(var(--rare-price-accent-rgb,158,133,80),.18);color:rgba(237,240,244,.72);font-size:10.5px;line-height:1.4; }
            .rarePricePlateWarningIcon { margin-right:6px;color:#ffce14;font-weight:800;letter-spacing:.04em; }
            .rarePricePlateNoAcc { margin-top:4px;padding-top:8px;border-top:1px solid rgba(var(--rare-price-accent-rgb,158,133,80),.18);color:rgba(237,240,244,.72);font-size:10.5px;line-height:1.42; }
            .rarePricePlateErrorText { margin-top:4px;padding-top:8px;border-top:1px solid rgba(255,92,92,.28);color:#ff8a8a;font:600 13px/1.35 "Open Sans",Arial,sans-serif; }
            .rarePricePlateFoot { display:flex;align-items:center;gap:8px;padding:7px 10px;border-top:1px solid rgba(var(--rare-price-accent-rgb,158,133,80),.34);font-size:10.5px;line-height:1.3;color:rgba(237,240,244,.5);white-space:nowrap; }
            .rarePricePlateFoot.is-warn { color:#c99516; }
            .rarePricePlateFoot.is-danger { color:#ff6b6b; }
            .rarePricePlateFootIcon { width:13px;height:13px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;color:rgba(237,240,244,.5); }
            .rarePricePlateFoot.is-warn .rarePricePlateFootIcon,.rarePricePlateFoot.is-danger .rarePricePlateFootIcon { color:currentColor; }
            .rarePricePlateFootIcon svg { width:13px;height:13px;display:block;stroke:currentColor;fill:none; }
            .rarePricePlateFootText { display:inline-block;min-width:148px; }
            .rarePricePlateMsg { flex:1;display:flex;align-items:center;gap:8px;padding:10px;font-size:12px;color:rgba(237,240,244,.76); }
            .rarePricePlateMsg.is-error { color:#ff8a8a; }
            .rareSteamValueExtra { margin-top:6px;line-height:1.35;color:inherit;font-weight:inherit; }
            .rareSteamValueExtra .Value.mainc { color:#59a8ff!important;font-size:inherit;line-height:inherit;font-weight:700;display:inline-flex;align-items:center;gap:7px;flex-wrap:wrap; }
            .rareSteamValueExtraDelta { margin-top:2px;color:#59a8ff!important;font-size:inherit;line-height:1.3;font-weight:700; }
            .rareSteamValueExtraIcon { width:0.95em;height:0.95em;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;color:currentColor; }
            .rareSteamValueExtraIcon svg { width:100%;height:100%;display:block;fill:currentColor; }
            .rareSteamValueExtraRefresh { width:1em;height:1em;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;color:currentColor;background:none;border:none;padding:0;cursor:pointer;opacity:.9;transition:opacity .15s ease,transform .15s ease; }
            .rareSteamValueExtraRefresh:hover { opacity:1;transform:rotate(-18deg); }
            .rareSteamValueExtraRefresh svg { width:100%;height:100%;display:block;stroke:currentColor; }
            .rareSteamValueExtra.muted { color:#6e89a8!important;font-weight:600; }
            .rareSteamCounterExtra { margin-top:4px;color:#59a8ff!important;font-size:inherit;line-height:1.35;font-weight:700; }
            .rareSteamItemExtraPrice { margin-top:4px;font-size:inherit;line-height:inherit;color:#59a8ff;font-weight:700;display:flex;align-items:center;gap:6px;flex-wrap:nowrap;width:100%;clear:both; }
            .rareSteamItemExtraPrice.muted { color:#6e89a8!important;font-weight:600; }
            .rareSteamItemExtraMain { display:inline-flex;align-items:center;gap:6px;min-width:0;line-height:1; }
            .rareSteamItemExtraIcon { width:13px;height:13px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;transform:translateY(-1px); }
            .rareSteamItemExtraIcon svg { width:13px;height:13px;display:block; }
            .rareSteamItemExtraLink { display:inline-flex;align-items:center;justify-content:center;color:inherit;text-decoration:none;opacity:.92; }
            .rareSteamItemExtraLink:hover { opacity:1; }
            .rareSteamItemExtraLink svg { width:13px;height:13px;display:block; }
            .rarePublishedAge { --rare-published-rgb:0,186,120;box-sizing:border-box;display:inline-flex;align-items:center;gap:4px;margin-left:7px;padding:1px 7px!important;border:1px solid rgba(var(--rare-published-rgb),.24);border-radius:999px;background:rgba(var(--rare-published-rgb),.10);box-shadow:inset 0 1px 0 rgba(255,255,255,.035);font-family:inherit!important;font-size:11.5px!important;font-weight:650!important;line-height:17px!important;font-variant-numeric:tabular-nums;letter-spacing:.01em;white-space:nowrap;vertical-align:middle;transform:translateY(-1px); }
            .rarePublishedAge svg { width:11px;height:11px;display:block;flex:0 0 auto;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;opacity:.86; }
            .rarePublishedAgeValue,.rarePublishedAgeSuffix { display:inline; }
            @media (max-width:650px) { .rarePublishedAgeSuffix { display:none; } }
            .rarePriceSpin { width:13px;height:13px;flex:0 0 auto;border-radius:50%;border:2px solid rgba(255,255,255,.22);border-top-color:rgba(255,255,255,.85);animation:rarePriceSpin .7s linear infinite; }
            @keyframes rarePriceSpin { to { transform:rotate(360deg); } }
            .rareCollections { position:relative;z-index:1000;overflow:visible; }
            .rareCollection { position:relative;overflow:visible;z-index:3; }
            .rareCollection:hover { z-index:1001; }
            .rareCollectionHead.rareHoverGlow { position:relative;overflow:visible;z-index:3; }
            .rareCollectionHead.rareHoverGlow::after { display:none; }
            @property --rareShimmerAngle { syntax:'<angle>'; initial-value:0deg; inherits:false; }
            .rareFxShimmer::before { content:'';position:absolute;inset:calc(-1 * var(--rare-shimmer-border));pointer-events:none;border-radius:calc(var(--rare-shimmer-radius) + var(--rare-shimmer-border));padding:var(--rare-shimmer-border);background:conic-gradient(from var(--rareShimmerAngle),rgba(255,255,255,0) 0deg,rgba(255,255,255,0) 282deg,rgba(255,255,255,.05) 302deg,rgba(255,255,255,.2) 320deg,rgba(255,255,255,.85) 335deg,rgba(255,255,255,.2) 350deg,rgba(255,255,255,.05) 358deg,rgba(255,255,255,0) 360deg);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);mask-composite:exclude;animation:rareShimmer 8.8s linear infinite;z-index:3; }
            @keyframes rareShimmer { to { --rareShimmerAngle:360deg; } }
            @keyframes rareFxParticleOrbit { from { transform:rotate(0deg) translateY(-3px) rotate(0deg) scale(.92); } 50% { transform:rotate(180deg) translateY(-6px) rotate(-180deg) scale(1.08); } to { transform:rotate(360deg) translateY(-3px) rotate(-360deg) scale(.92); } }
    `;
    const _CSS_FLOAT_BTN = `
            #rareFloatBtn { position:fixed;right:68px;bottom:15px;width:59px;height:59px;border-radius:50%;background:linear-gradient(180deg,rgba(41,161,107,.34),rgba(41,161,107,.18)),rgb(10,12,16);color:#f5f7fb;display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:8;transition:transform .22s ease,background .22s ease,border-color .22s ease,box-shadow .22s ease,opacity .2s ease;pointer-events:auto;border:1px solid rgba(41,161,107,.30);box-shadow:0 10px 34px rgba(41,161,107,.18);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);overflow:hidden; }
            #rareFloatBtn::before { content:none; }
            #rareFloatBtn:hover { transform:scale(1.06); }
            #rareFloatBtn svg { width:24px;height:24px;position:relative;z-index:1;color:inherit!important;stroke:currentColor!important;fill:none!important;opacity:1!important;display:block!important; }
            @media (max-width:1260px) { #rareFloatBtn { display:none!important; } }
    `;
    const _CSS_PANEL = `
            .rareBucket { margin:0 0 18px; }
            .rareBucketHead { display:flex;align-items:center;gap:6px;margin:0 0 12px;color:#ffce14;font-weight:700;font-size:15px; }
            .rareBucketHead .rareGridTitle { color:#ffce14; }
            .rareHeadInline { display:flex;align-items:center;gap:5px;margin:8px 0 12px;color:#ffce14;font-weight:700;font-size:15px;line-height:1.3; }
            .rareHeadInline .rareGridTitle { color:#ffce14; }
            .rareGridTitle svg { width:15px;height:15px;display:block;fill:currentColor; }
            .rareHeadInline .rareSkinsGear svg { width:15px;height:15px; }
            .rareOtherTitle { margin:0 0 12px;color:#c9ccd1;font-weight:700;font-size:15px; }
            .rareBucketScroll { overflow:visible; }
            .rareSkinsGear { cursor:pointer;margin-left:8px;color:#8c8c8c;transition:color .15s;vertical-align:middle;display:inline-flex; }
            .rareSkinsGear:hover { color:#00ba78; }
            .rareSkinsGearPalette { position:fixed;display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:999px;background:rgba(12,15,20,.92);border:1px solid rgba(255,255,255,.08);box-shadow:0 12px 28px rgba(0,0,0,.34);opacity:0;visibility:hidden;pointer-events:none;transform:translateX(10px);transition:opacity .18s ease,transform .18s ease,visibility .18s ease;z-index:1000001;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px); }
            .rareSkinsGearPalette.show { opacity:1;visibility:visible;pointer-events:auto;transform:translateX(0); }
            .rareSkinsGearColor { width:13px;height:13px;border-radius:50%;border:none;padding:0;cursor:pointer;box-shadow:0 0 0 1px rgba(255,255,255,.14),0 0 0 3px transparent;transition:transform .14s ease,box-shadow .14s ease;flex:0 0 auto;background:var(--rare-gear-color); }
            .rareSkinsGearColor:hover { transform:scale(1.14);box-shadow:0 0 0 1px rgba(255,255,255,.22),0 0 0 3px rgba(255,255,255,.08); }
            .rareSkinsGearColor.active { box-shadow:0 0 0 1px rgba(255,255,255,.3),0 0 0 3px color-mix(in srgb, var(--rare-gear-color) 45%, rgba(255,255,255,.22)); }
    `;
    const _CSS_MODAL_BASE = `
            #rareModal { --rare-accent:#00ba78;position:fixed;inset:0;background:rgba(0,0,0,.72);backdrop-filter:blur(3px);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:"Open Sans",Arial,sans-serif;animation:rareFade .18s ease; }
            @keyframes rareFade { from{opacity:0} to{opacity:1} }
            #rareModal .rareBox { width:560px;max-width:94vw;height:86vh;max-height:96vh;background:#151719;border:1px solid #2a2d31;border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,.6);display:flex;flex-direction:column;overflow:hidden; }
            #rareModal .rareHead { display:flex;align-items:center;gap:14px;padding:20px 24px;border-bottom:1px solid #24272b; }
            #rareModal .rareHeadIcon { width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--rare-accent),#9b59f6);flex:0 0 auto;color:#fff; }
            #rareModal .rareHeadIcon svg { width:22px;height:22px; }
            #rareModal .rareHeadText { flex:1;display:flex;align-items:center; }
            #rareModal .rareHeadText h3 { margin:0;color:#fff;font-size:18px; }
            #rareModal .rareClose { cursor:pointer;color:#8c8c8c;background:none;border:none;padding:4px;border-radius:8px;transition:all .15s;display:flex;align-items:center;justify-content:center;flex:0 0 auto; }
            #rareModal .rareClose:hover { color:#fff;background:#24272b; }
            #rareModal .rareTabs { display:flex;gap:8px;padding:14px 24px 0; }
            #rareModal .rareTab { flex:1;padding:10px 0;border:none;cursor:pointer;background:#1a1d20;color:#8c8c8c;border-radius:9px 9px 0 0;font-size:13px;font-weight:600;border-bottom:2px solid transparent;transition:all .15s; }
            #rareModal .rareTab:hover { color:#e8e8e8; }
            #rareModal .rareTab.active { color:#fff;background:#1a1d20;border-bottom-color:var(--rare-accent); }
            #rareModal .rareSubTabs { display:flex;gap:8px;padding:0 0 18px;align-items:stretch; }
            #rareModal .rareSubTab { flex:1 1 0;box-sizing:border-box;padding:9px 10px;border:1px solid #24272b;cursor:pointer;background:#101214;color:#8c8c8c;border-radius:8px;font-size:13px;font-weight:600;line-height:1.2;text-align:center;transition:color .15s,background .15s,border-color .15s; }
            #rareModal .rareSubTab:hover { color:#e8e8e8;border-color:#3a3e44; }
            #rareModal .rareSubTab.active { color:#fff;background:#1f2429;border-color:var(--rare-accent); }
            #rareModal .rareBody { display:block;padding:22px 24px;overflow-y:auto; }
            #rareModal .rareCol { display:flex;flex-direction:column;gap:18px; }
            #rareModal .rareCard { background:#1a1d20;border:1px solid #24272b;border-radius:12px;padding:16px; }
            #rareModal .rareCard h4 { margin:0 0 4px;color:#fff;font-size:15px;display:flex;align-items:center;gap:8px; }
            #rareModal .rareCard .rareSubTxt { margin:0 0 12px;color:#7d8288;font-size:12px;line-height:1.4; }
            #rareModal .rareInputRow { display:flex;gap:8px;margin-bottom:12px; }
            #rareModal .rareInputRow input { flex:1;background:#101214;color:#eee;border:1px solid #2f3338;border-radius:8px;padding:10px 12px;font-size:13px;outline:none;transition:border-color .15s; }
            #rareModal .rareInputRow input:focus { border-color:var(--rare-accent); }
            #rareModal .rareInputRow textarea, #rareModal .rareTextarea { width:100%;min-height:92px;background:#101214;color:#eee;border:1px solid #2f3338;border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.45;outline:none;resize:vertical;transition:border-color .15s;box-sizing:border-box; }
            #rareModal .rareInputRow textarea:focus, #rareModal .rareTextarea:focus { border-color:var(--rare-accent); }
            #rareModal .rareInputNote { margin:-4px 0 12px;color:#8f9aa6;font-size:11px;line-height:1.45; }
            #rareModal .rareAddBtn { width:40px;flex:0 0 auto;border:none;cursor:pointer;background:var(--rare-accent);color:#fff;border-radius:8px;font-size:20px;display:flex;align-items:center;justify-content:center;transition:filter .15s; }
            #rareModal .rareAddBtn:hover { filter:brightness(1.12); }
            #rareModal .rareList { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;max-height:360px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#3a3f46 #171a1e; }
            #rareModal .rareList::-webkit-scrollbar { width:10px; }
            #rareModal .rareList::-webkit-scrollbar-track { background:#171a1e;border-radius:10px; }
            #rareModal .rareList::-webkit-scrollbar-thumb { background:linear-gradient(180deg,#3a3f46,#2a2f35);border-radius:10px;border:2px solid #171a1e; }
            #rareModal .rareList::-webkit-scrollbar-thumb:hover { background:linear-gradient(180deg,#4a5058,#343941); }
            #rareModal .rareChip { position:relative;display:flex;align-items:center;gap:9px;background:#101214;border:1px solid #24272b;border-left:3px solid var(--chip-color,#00ba78);border-radius:8px;padding:7px 11px;min-height:52px; }
            #rareModal .rareChip .dot { width:20px;height:20px;flex:0 0 auto;border-radius:50%;cursor:pointer;border:2px solid rgba(255,255,255,.25);transition:transform .12s; }
            #rareModal .rareChip .dot:hover { transform:scale(1.12); }
            #rareModal .rareChip .rareChipGrip { flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;width:30px;height:36px;margin:-7px -6px;color:rgba(255,255,255,.4);cursor:grab;border-radius:6px; }
            #rareModal .rareChip .rareChipGrip:active { cursor:grabbing; }
            #rareModal .rareChip .rareChipNum { flex:0 0 auto;min-width:18px;text-align:center;color:rgba(255,255,255,.42);font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;user-select:none; }
            #rareModal .rareListPriorityNote { margin:-6px 0 12px;padding:8px 10px;border-left:2px solid rgba(var(--rare-accent-rgb,0,186,120),.5);background:rgba(var(--rare-accent-rgb,0,186,120),.06);border-radius:0 6px 6px 0;color:#9fb0c0;font-size:11px;line-height:1.45; }
            #rareModal .rareFpWarnNote { margin:10px 0 0;padding:8px 10px;border-left:2px solid rgba(255,92,92,.6);background:rgba(255,92,92,.08);border-radius:0 6px 6px 0;color:#ff9a9a;font-size:11px;line-height:1.45; }
            #rareModal .rareChip.rareDragActive { display:none!important; }
            #rareModal .rareList.rareDragging { display:flex!important;flex-direction:column!important;gap:8px!important; }
            #rareModal .rareDragPlaceholder { flex:0 0 auto;border-radius:8px;border:1.5px solid rgba(var(--rare-accent-rgb,0,186,120),.6);background:rgba(var(--rare-accent-rgb,0,186,120),.1);box-sizing:border-box; }
            #rareModal .rareLevelFilter { margin:8px 0 4px;padding:9px 11px;background:color-mix(in srgb,var(--rare-modal-bg-soft) 88%,#000 12%);border:1px solid rgba(var(--rare-accent-rgb,0,186,120),.18);border-radius:8px;display:flex;flex-direction:column;gap:8px;box-shadow:inset 0 1px 0 rgba(255,255,255,.03); }
            #rareModal .rareLevelToggle { display:inline-flex;align-items:center;gap:8px;color:#e8edf1;font-size:12px;cursor:pointer;user-select:none; }
            #rareModal .rareLevelToggle input { width:16px;height:16px;accent-color:var(--rare-accent,#00ba78);cursor:pointer; }
            #rareModal .rareLevelRow { display:flex;align-items:center;gap:8px; }
            #rareModal .rareLevelRow .rareLevelLbl { color:#cfd3d8;font-size:12px; }
            #rareModal .rareLevelRow .rareLevelMin { width:110px;background:color-mix(in srgb,var(--rare-modal-bg-strong) 88%,#000 12%);color:#eef3f6;border:1px solid rgba(var(--rare-accent-rgb,0,186,120),.22);border-radius:6px;padding:5px 8px;font-size:12px;outline:none; }
            #rareModal .rareLevelRow .rareLevelMin:focus { border-color:var(--rare-accent,#00ba78);box-shadow:0 0 0 2px rgba(var(--rare-accent-rgb,0,186,120),.12); }
            #rareModal .rareChip .name { flex:1;color:#e8e8e8;font-size:13px;text-transform:uppercase;display:flex;align-items:center;min-height:100%; }
            #rareModal .rareChip .rareChipChecks { flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:3px;min-width:102px; }
            #rareModal .rareChip .rareEffectSelect { flex:0 0 auto;background:#0c0e10;color:#eee;border:1px solid #2f3338;border-radius:6px;padding:5px 7px;font-size:12px;outline:none;cursor:pointer; }
            #rareModal .rareChip .rareEffectSelect:focus { border-color:var(--rare-accent); }
            #rareModal .rareChip .rareEffectCheck { flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;color:#cfd3d8;font-size:12px;cursor:pointer;user-select:none;white-space:nowrap; }
            #rareModal .rareChip .rareEffectCheck input { position:absolute!important;opacity:0!important;width:0!important;height:0!important;margin:0!important;padding:0!important;pointer-events:none!important;clip:rect(0 0 0 0)!important; }
            #rareModal .rareChip .rarePowerCheck input { position:static!important;opacity:1!important;width:46px!important;height:24px!important;margin:0!important;padding:2px 6px!important;pointer-events:auto!important;clip:auto!important;background:color-mix(in srgb,var(--rare-modal-bg-strong) 88%,#000 12%)!important;color:#eef3f6!important;border:1px solid rgba(var(--rare-accent-rgb,0,186,120),.22)!important;border-radius:6px!important;font-size:12px!important;outline:none!important; }
            #rareModal .rareChip .rarePowerCheck input:focus { border-color:var(--rare-accent,#00ba78)!important;box-shadow:0 0 0 2px rgba(var(--rare-accent-rgb,0,186,120),.12)!important; }
            #rareModal .rareChip .rareEffectMark { display:inline-block!important;width:18px!important;height:18px!important;min-width:18px!important;border:2px solid rgba(var(--rare-accent-rgb),.36)!important;border-radius:4px!important;background:color-mix(in srgb, var(--rare-modal-bg-soft) 82%, #000 18%)!important;position:relative!important;box-sizing:border-box!important;flex:0 0 auto!important;transition:background .12s,border-color .12s,box-shadow .12s; }
            #rareModal .rareChip .rareEffectMark.on { background:var(--rare-accent)!important;border-color:var(--rare-accent)!important;box-shadow:0 0 10px rgba(var(--rare-accent-rgb),.18)!important; }
            #rareModal .rareChip .rareEffectMark.on::after { content:''!important;display:block!important;position:absolute!important;left:4px!important;top:0px!important;width:5px!important;height:10px!important;border:solid #fff!important;border-width:0 2px 2px 0!important;transform:rotate(45deg)!important;box-sizing:border-box!important; }
            #rareModal .rareChip .del { cursor:pointer;color:#6b7076;background:none;border:none;padding:2px;border-radius:6px;display:flex;transition:all .15s; }
            #rareModal .rareChip .del:hover { color:var(--rare-accent); }
            #rareModal .rareList { display:grid;grid-template-columns:minmax(0,1fr);gap:8px;max-height:360px;overflow-y:auto;overflow-x:hidden; }
            #rareModal .rareChip { min-height:40px;padding:5px 9px;gap:7px; }
            #rareModal .rareChip .name { font-size:12px; }
            #rareModal .rareChip .rareChipChecks { gap:2px;min-width:92px; }
            #rareModal .rareChip .rareEffectSelect { padding:4px 6px;font-size:11px; }
            #rareModal .rareChip .rareEffectCheck { font-size:11px; }
            #rareModal .rareChip .dot { width:18px;height:18px; }
            #rareModal .rareEmpty { color:#5a5e63;font-size:12px;text-align:center;padding:16px; }
            .rareConfirmOverlay { position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.5);z-index:2000000;opacity:0;pointer-events:none;transition:opacity .14s ease; }
            .rareConfirmOverlay.show { opacity:1;pointer-events:auto; }
            .rareConfirmBox { width:300px;max-width:88%;border-radius:14px;padding:18px;box-sizing:border-box;transform:translateY(6px);transition:transform .14s ease; }
            .rareConfirmOverlay.show .rareConfirmBox { transform:translateY(0); }
            .rareConfirmTitle { margin:0 0 6px;font-size:14px;font-weight:700;color:#fff; }
            .rareConfirmBody { margin:0 0 16px;font-size:12.5px;line-height:1.45;color:#b9c1c9; }
            .rareConfirmActions { display:flex;justify-content:flex-end;gap:8px; }
            .rareConfirmBtn { font-size:12px;font-weight:600;padding:7px 14px;border-radius:8px;cursor:pointer;transition:filter .14s ease,transform .14s ease; }
            .rareConfirmBtn:hover { filter:brightness(1.08); }
            .rareConfirmBtnGhost { background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#d5d8dd; }
            .rareConfirmBtnDanger { color:#fff; }
            #rareModal .rareCard h4 { display:flex;align-items:center;justify-content:space-between;gap:8px; }
            #rareModal .rareListHeadActions { display:inline-flex;align-items:center;gap:4px;margin-left:auto; }
            #rareModal .rareIconBtn { display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:6px;border:1px solid rgba(255,255,255,.08);background:var(--rare-modal-bg-soft,rgba(255,255,255,.03));color:#9aa0aa;cursor:pointer;transition:background .14s,border-color .14s,color .14s; }
            #rareModal .rareIconBtn:hover { color:var(--rare-accent);border-color:rgba(var(--rare-accent-rgb),.4);background:rgba(var(--rare-accent-rgb),.1); }
            #rareModal .rareIconBtnDanger:hover { color:#ff8080;border-color:rgba(255,92,92,.45);background:rgba(255,92,92,.1); }
            #rareModal .rareHint { margin-top:12px;display:flex;gap:8px;background:#14171a;border-radius:8px;padding:10px 12px;color:#8c8c8c;font-size:12px;line-height:1.4; }
            #rareModal .rareHint b { color:var(--rare-accent); }
            #rareModal .rarePop { position:fixed;z-index:1000000;background:#1b1e22;border:1px solid #33373d;border-radius:12px;padding:12px;box-shadow:0 16px 40px rgba(0,0,0,.55);width:212px;box-sizing:border-box; }
            #rareModal .rarePopGrid { display:grid;grid-template-columns:repeat(4,1fr);gap:10px; }
            #rareModal .rareSwatch { width:32px;height:32px;border-radius:50%;cursor:pointer;border:2px solid transparent;position:relative;transition:transform .12s,box-shadow .12s;box-shadow:0 0 0 1px rgba(255,255,255,.06) inset;margin:auto; }
            #rareModal .rareSwatch:hover { transform:scale(1.12); }
            #rareModal .rareSwatch.active { border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.25); }
            #rareModal .rareSwatch.active::after { content:'';position:absolute;left:50%;top:46%;width:6px;height:11px;border:solid #fff;border-width:0 2px 2px 0;transform:translate(-50%,-60%) rotate(45deg);filter:drop-shadow(0 1px 1px rgba(0,0,0,.5)); }
            #rareModal .rarePopDivider { height:1px;background:#2c3036;margin:12px 0; }
            #rareModal .rareSwatchCustom { position:relative;display:flex;align-items:center;gap:10px;width:100%;padding:8px 10px;border-radius:9px;border:1px solid #33373d;background:#22262b;cursor:pointer;transition:border-color .15s,background .15s;box-sizing:border-box; }
            #rareModal .rareSwatchCustom:hover { border-color:#4a4f56;background:#262a30; }
            #rareModal .rareSwatchCustom.active { border-color:#fff; }
            #rareModal .rareSwatchCustom .ccIco { width:26px;height:26px;flex:0 0 auto;border-radius:7px;background:conic-gradient(from 0deg,#ff2d55,#ff6b00,#ffce14,#00ba78,#00bcd4,#3d7bff,#9b59f6,#e040fb,#ff2d55);display:flex;align-items:center;justify-content:center; }
            #rareModal .rareSwatchCustom .ccIco svg { width:15px;height:15px;color:#fff;filter:drop-shadow(0 1px 2px rgba(0,0,0,.7)); }
            #rareModal .rareSwatchCustom .ccTxt { color:#e8e8e8;font-size:13px;font-weight:600; }
            #rareModal .rareSwatchCustom input { position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;padding:0;border:none; }
            #rareModal .rareFoot { display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 24px;border-top:1px solid #24272b; }
            #rareModal .rareBtn { padding:10px 18px;border-radius:9px;border:none;cursor:pointer;font-size:13px;font-weight:600;transition:filter .15s,background .15s; }
            #rareModal .rareBtnCancel { background:transparent;color:#b7bbc0; }
            #rareModal .rareBtnCancel:hover { color:#fff; }
            #rareModal .rareBtnGhost { background:#1f2328;color:#cfd3d8; }
            #rareModal .rareBtnGhost:hover { color:#fff;filter:brightness(1.06); }
            #rareModal .rareBtnSave { background:var(--rare-accent);color:#fff; }
            #rareModal .rareBtnSave:hover { filter:brightness(1.12); }
            #rareModal .rareBtnCancel { margin-left:auto; }
    `;
    const _CSS_TOAST = `
            .rareToastStack { position:fixed;left:50%;bottom:18px;transform:translateX(-50%);display:flex;flex-direction:column-reverse;align-items:center;gap:10px;z-index:1000002;pointer-events:none;max-width:calc(100vw - 24px); }
            .rareToast { position:absolute;bottom:0;display:flex;align-items:center;gap:10px;max-width:min(420px,calc(100vw - 24px));padding:12px 16px;border:1px solid rgba(var(--rare-toast-accent-rgb,63,188,135),.42);border-radius:14px;background:linear-gradient(180deg,rgba(var(--rare-toast-accent-rgb,63,188,135),.16),rgba(var(--rare-toast-accent-rgb,63,188,135),.08)),var(--rare-toast-bg,#121916);box-shadow:0 16px 36px rgba(0,0,0,.34);color:#eef3f8;font:600 13px/1.35 "Open Sans",Arial,sans-serif;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,transform .18s ease,visibility .18s ease;transform:translateY(16px);z-index:1;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);overflow:hidden;isolation:isolate; }
            .rareToast.is-error { background:linear-gradient(180deg,rgba(255,92,92,.20),rgba(124,20,26,.18)),#1b0b0d;border-color:rgba(255,92,92,.48);box-shadow:0 16px 36px rgba(42,0,4,.46); }
            .rareToast.show { position:relative;bottom:auto;opacity:1;visibility:visible;transform:translateY(0);pointer-events:auto; }
            @keyframes rareToastShimmer { 0%{ transform:translateX(-160%) skewX(-22deg); } 100%{ transform:translateX(220%) skewX(-22deg); } }
            .rareToast::before { content:'';position:absolute;top:0;bottom:0;left:0;width:42%;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.14),rgba(255,255,255,0));pointer-events:none;z-index:0;animation:rareToastShimmer 2.4s ease-in-out infinite; }
            .rareToast > * { position:relative;z-index:1; }
            .rareToastCheck { position:relative;width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;color:var(--rare-toast-accent,#3fbc87);filter:drop-shadow(0 0 6px rgba(var(--rare-toast-accent-rgb,63,188,135),.22)); }
            .rareToastCheck svg { width:18px;height:18px;display:block;stroke:currentColor;fill:none; }
            .rareFpSpinner { width:18px;height:18px;flex:0 0 auto;border:2.4px solid rgba(var(--rare-toast-accent-rgb,63,188,135),.28);border-top-color:var(--rare-toast-accent,#3fbc87);border-radius:50%;animation:rarePriceSpin .7s linear infinite; }
            .rareFpPublishToast { pointer-events:auto;cursor:default; }

            .rareFpPublishToast .rareFpPublishText { display:flex;flex-direction:column;gap:2px;min-width:0;flex:1 1 auto; }
            .rareFpPublishCancel { flex:0 0 auto;margin-left:6px;padding:5px 12px;border-radius:8px;font:700 12px/1 "Open Sans",Arial,sans-serif;letter-spacing:.02em;cursor:pointer;color:#ffd9d9;border:1px solid rgba(255,92,92,.42);background:linear-gradient(180deg,rgba(255,92,92,.18),rgba(255,92,92,.07));transition:background .15s ease,border-color .15s ease,box-shadow .15s ease; }
            .rareFpPublishCancel:hover { color:#fff;border-color:rgba(255,92,92,.7);background:linear-gradient(180deg,rgba(255,92,92,.32),rgba(255,92,92,.14));box-shadow:0 6px 16px rgba(255,92,92,.2); }
            .rareFpPublishToast .rareFpPublishTitle { font-size:12px;font-weight:800;letter-spacing:.03em;text-transform:uppercase;color:#fff; }
            .rareFpPublishToast .rareFpPublishBody { font-size:12px;font-weight:600;color:rgba(238,243,248,.82);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:320px; }
            .rareHintToast { align-items:flex-start;gap:12px;padding:14px 16px;pointer-events:auto; }
            .rareTokenToast { max-width:min(520px,calc(100vw - 24px)); }
            .rareHintToastText { min-width:0;display:flex;flex-direction:column;gap:5px; }
            .rareHintToastTitle { font-size:12px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:#fff; }
            .rareHintToastBody { font-size:12px;line-height:1.45;color:rgba(237,240,244,.88);font-weight:600; }
            .rareHintToastActions { display:flex;align-items:center;gap:8px;margin-top:8px; }
            .rareHintToastBtn { min-width:0;padding:7px 10px;border-radius:9px;border:1px solid rgba(var(--rare-toast-accent-rgb,158,133,80),.24);background:linear-gradient(180deg,rgba(var(--rare-toast-accent-rgb,158,133,80),.12),rgba(var(--rare-toast-accent-rgb,158,133,80),.05)),var(--rare-toast-bg,#121916);color:#eef3f8;font:600 12px/1 "Open Sans",Arial,sans-serif;cursor:pointer;transition:border-color .15s ease,background .15s ease,color .15s ease,filter .15s ease,box-shadow .15s ease;appearance:none;-webkit-appearance:none; }
            .rareHintToastBtn:hover { border-color:rgba(var(--rare-toast-accent-rgb,158,133,80),.34);background:linear-gradient(180deg,rgba(var(--rare-toast-accent-rgb,158,133,80),.16),rgba(var(--rare-toast-accent-rgb,158,133,80),.07)),var(--rare-toast-bg,#121916);filter:brightness(1.03); }
            .rareHintToastBtn.is-accent { background:linear-gradient(180deg,rgba(var(--rare-toast-accent-rgb,158,133,80),.12),rgba(var(--rare-toast-accent-rgb,158,133,80),.05)),var(--rare-toast-bg,#121916);border-color:rgba(var(--rare-toast-accent-rgb,158,133,80),.24);color:#fff;box-shadow:none; }
            .rareHintToastClose { width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;padding:0;border:none;background:none;color:rgba(237,240,244,.64);cursor:pointer;border-radius:7px;transition:color .15s ease,background .15s ease; }
            .rareHintToastClose:hover { color:#fff;background:rgba(255,255,255,.06); }
            .rareHintToastClose svg { width:14px;height:14px;display:block;stroke:currentColor;fill:none; }
            /* Компактный незакрываемый тост-уведомление (только .rareNoticeToast). */
            .rareNoticeToast { align-items:center;gap:10px;padding:10px 12px;max-width:min(340px,calc(100vw - 24px)); }
            .rareNoticeToast .rareToastCheck { width:16px;height:16px;align-self:center; }
            .rareNoticeToast .rareToastCheck svg { width:16px;height:16px; }
            .rareNoticeToast .rareHintToastText { gap:2px;flex:1 1 auto; }
            .rareNoticeToast .rareHintToastTitle { font-size:10px;letter-spacing:.06em;opacity:.7; }
            .rareNoticeToast .rareHintToastBody { font-size:12px;line-height:1.3; }
            .rareNoticeToast .rareHintToastActions { margin-top:0;flex:0 0 auto;align-self:center; }
            .rareNoticeToast .rareHintToastBtn { padding:6px 12px;border-radius:8px; }
            .lastActivityDays { font-weight:700;display:inline-block;line-height:inherit;padding:0 3px;margin:0;vertical-align:baseline;overflow:visible;position:relative;z-index:1; }
            .counter:has(.lastActivityDays), .counter .label:has(.lastActivityDays) { overflow:visible!important; }
            @keyframes ladBlink { 0%,100%{opacity:1} 50%{opacity:.4} }
            @keyframes ladShimmerText { 0%,12%{background-position:140% 0} 55%{background-position:-40% 0} 100%{background-position:-40% 0} }
    `;
    const _CSS_ACTIVITY = `
            #rareModal .actIntro { color:#8c8c8c;font-size:12px;line-height:1.4;margin:0 0 14px; }
            #rareModal .actLevels { display:flex;flex-direction:column;gap:10px; }
            #rareModal .actLevel { display:flex;align-items:center;gap:10px;background:#101214;border:1px solid #24272b;border-radius:9px;padding:10px 12px; }
            #rareModal .actLevel .lvlRange { display:flex;align-items:center;gap:6px;color:#b7bbc0;font-size:12px;flex:0 0 auto; }
            #rareModal .actLevel .lvlRange input { width:52px;background:#0c0e10;color:#eee;border:1px solid #2f3338;border-radius:6px;padding:6px 6px;font-size:12px;outline:none;text-align:center; }
            #rareModal .actLevel .lvlRange input:focus { border-color:var(--rare-accent); }
            #rareModal .actLevel .lvlInf { color:#7d8288;font-size:12px;white-space:nowrap; }
            #rareModal .actDot { width:26px;height:26px;flex:0 0 auto;border-radius:50%;cursor:pointer;border:2px solid rgba(255,255,255,.25); }
            #rareModal .actLevel select { flex:0 0 auto;background:#0c0e10;color:#eee;border:1px solid #2f3338;border-radius:6px;padding:6px 8px;font-size:12px;outline:none;cursor:pointer; }
            #rareModal .actPrev { margin-left:auto;min-width:88px;text-align:center;font-size:13px;color:#eee;flex:0 0 auto; }
            #rareModal .actDel { flex:0 0 auto;cursor:pointer;color:#6b7076;background:none;border:none;padding:4px;border-radius:6px;display:flex; }
            #rareModal .actDel:hover { color:var(--rare-accent); }
            #rareModal .actAdd { margin-top:12px;width:100%;padding:10px;border:1px dashed #3a3e44;background:transparent;color:#b7bbc0;border-radius:9px;cursor:pointer;font-size:13px;transition:all .15s; }
            #rareModal .actAdd:hover { border-color:var(--rare-accent);color:#fff; }
    `;
    const _CSS_CUSTOM = `
            #rareModal .rareCustomView { display:flex;flex-direction:column;gap:24px; }
            #rareModal .rareStatsView { display:flex;flex-direction:column;gap:18px; }
            #rareModal .rareStatsHead { display:flex;align-items:flex-start;justify-content:space-between;gap:12px; }
            #rareModal .rareStatsActions { display:flex;align-items:center;gap:10px;flex:0 0 auto; }
            #rareModal .rareStatsUpdated { color:#8f9aa6;font-size:11px;white-space:nowrap; }
            #rareModal .rareStatsRefresh { width:32px;height:32px;padding:0!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;line-height:0!important; }
            #rareModal .rareStatsRefreshIcon { width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;flex:0 0 16px; }
            #rareModal .rareStatsRefreshIcon svg { width:16px!important;height:16px!important;display:block!important; }
            #rareModal .rareStatsGrid { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px; }
            #rareModal .rareStatsCard { background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:6px; }
            #rareModal .rareStatsCardLabel { color:#8f9aa6;font-size:11px;text-transform:uppercase;letter-spacing:.08em; }
            #rareModal .rareStatsCardValue { color:#fff;font-size:20px;font-weight:700; }
            #rareModal .rareStatsCardMeta { color:#b9c1c9;font-size:12px;line-height:1.45; }
            #rareModal .rareStatsCard--skeleton { position:relative;overflow:hidden;pointer-events:none; }
            #rareModal .rareStatsCard--skeleton .rareStatsCardLabel { opacity:.55; }
            #rareModal .rareStatsSkelLine { position:relative;overflow:hidden;border-radius:6px;background:rgba(255,255,255,.06); }
            #rareModal .rareStatsSkelValue { height:22px;width:62%;margin-top:2px; }
            #rareModal .rareStatsSkelMeta { height:12px;width:88%;margin-top:8px; }
            #rareModal .rareStatsSkelMeta.is-short { width:60%;margin-top:6px; }
            #rareModal .rareStatsSkelLine::after { content:'';position:absolute;inset:0;transform:translateX(-100%);background:linear-gradient(90deg,transparent 0%,rgba(var(--rare-accent-rgb,63,188,135),.18) 45%,rgba(var(--rare-accent-rgb,63,188,135),.28) 50%,rgba(var(--rare-accent-rgb,63,188,135),.18) 55%,transparent 100%);animation:rareStatsShimmer 1.25s ease-in-out infinite; }
            #rareModal .rareStatsCard--skeleton:nth-child(2) .rareStatsSkelLine::after { animation-delay:.12s; }
            #rareModal .rareStatsCard--skeleton:nth-child(3) .rareStatsSkelLine::after { animation-delay:.24s; }
            @keyframes rareStatsShimmer { 0%{ transform:translateX(-100%); } 60%,100%{ transform:translateX(100%); } }
            #rareModal .rareStatsCard--skeleton { animation:rareStatsCardPulse 1.6s ease-in-out infinite; }
            #rareModal .rareStatsCard--skeleton:nth-child(2) { animation-delay:.1s; }
            #rareModal .rareStatsCard--skeleton:nth-child(3) { animation-delay:.2s; }
            @keyframes rareStatsCardPulse { 0%,100%{ border-color:rgba(255,255,255,.05); } 50%{ border-color:rgba(var(--rare-accent-rgb,63,188,135),.28); } }
            #rareModal .rareStatsCard--enter { animation:rareStatsCardEnter .32s ease both; }
            @keyframes rareStatsCardEnter { from{ opacity:0;transform:translateY(8px); } to{ opacity:1;transform:translateY(0); } }
            #rareModal .cstRow { display:flex;align-items:center;gap:12px;padding:9px 0;border-top:1px solid #22262b; }
            #rareModal .cstRow:first-of-type { border-top:none; }
            #rareModal .cstLabel { flex:1;color:#d5d8dd;font-size:13px; }
            #rareModal .cstDot { width:26px;height:26px;flex:0 0 auto;border-radius:50%;cursor:pointer;border:none;box-sizing:border-box;background-clip:border-box;box-shadow:inset 0 0 0 2px rgba(255,255,255,.25);transition:transform .12s; }
            #rareModal .cstDot:hover { transform:scale(1.1); }
            #rareModal .cstSwitch { position:relative;display:inline-block;width:42px;height:24px;flex:0 0 auto;cursor:pointer; }
            #rareModal .cstSwitch input { opacity:0;width:0;height:0; }
            #rareModal .cstSlider { position:absolute;inset:0;background:#33373d;border-radius:24px;transition:background .15s; }
            #rareModal .cstSlider::before { content:'';position:absolute;left:3px;top:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s; }
            #rareModal .cstSwitch input:checked + .cstSlider { background:var(--rare-accent); }
            #rareModal .cstSwitch input:checked + .cstSlider::before { transform:translateX(18px); }
            #rareModal .cstRangeVal { flex:0 0 auto;min-width:42px;text-align:right;color:#9aa0a6;font-size:12px; }
            #rareModal .cstPreviewWrap { display:flex;justify-content:center;padding:18px 0 4px; }
            #rareModal .cstPaletteGrid { display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;margin-top:8px; }
            #rareModal .cstPaletteBtn { position:relative;display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;gap:8px;padding:8px;border:1px solid rgba(255,255,255,.05);background:linear-gradient(180deg,rgba(255,255,255,.02),rgba(255,255,255,.01));color:#fff;border-radius:10px;cursor:pointer;transition:border-color .15s,background .15s,transform .15s,box-shadow .15s;overflow:hidden; }
            #rareModal .cstPaletteBtn::before { content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(255,255,255,.03),transparent 55%);pointer-events:none; }
            #rareModal .cstPaletteBtn:hover { background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.015));transform:translateY(-1px); }
            #rareModal .cstPaletteBtn.active { border-color:rgba(var(--rare-accent-rgb,63,188,135),.34);box-shadow:none; }
            #rareModal .cstPaletteHero { height:34px;border-radius:8px;background:linear-gradient(135deg,var(--p-bg1),var(--p-bg2));border:1px solid rgba(255,255,255,.05);position:relative;overflow:hidden; }
            #rareModal .cstPaletteHero::after { content:'';position:absolute;inset:auto -10% 0 auto;width:70%;height:60%;background:radial-gradient(circle at center,rgba(255,255,255,.12),transparent 68%); }
            #rareModal .cstPaletteSwatches { display:flex;align-items:center;gap:5px; }
            #rareModal .cstPaletteSwatches span { width:10px;height:10px;border-radius:50%;display:block;box-shadow:0 0 0 1px rgba(255,255,255,.07) inset; }
            #rareModal .cstPaletteMeta { display:flex;align-items:center;justify-content:space-between;gap:8px; }
            #rareModal .cstPaletteBtnLabel { font-size:11px;font-weight:700;color:#eef3f8; }
            #rareModal .cstPaletteCheck { width:18px;height:18px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.05);color:transparent;flex:0 0 auto; }
            #rareModal .cstPaletteBtn.active .cstPaletteCheck { color:#05070a;background:var(--rare-accent);border-color:var(--rare-accent); }
            #rareModal .cstPaletteCheck svg { width:11px;height:11px; }
            #rareModal .cstCardTight { padding-bottom:16px!important; }
            #rareModal .cstPreviewBtn { width:60px;height:60px;border-radius:50%;background:#9b59f6;color:#fff;display:flex;align-items:center;justify-content:center; }
            #rareModal .cstPreviewBtn svg { width:28px;height:28px; }
            #rareModal .cstHintsReset { width:100%;margin-top:4px;padding:10px;border:1px dashed #3a3e44;background:transparent;color:#b7bbc0;border-radius:9px;cursor:pointer;font-size:13px;transition:all .15s; }
            #rareModal .cstHintsReset:hover { border-color:var(--rare-accent);color:#fff; }
    `;
    const _CSS_REDESIGN = `
            /* Native LZT Market redesign */
            #rareFloatBtn { width:59px!important;height:59px!important;border-radius:50%!important;border:1px solid rgba(255,255,255,.08)!important;box-shadow:0 10px 34px rgba(0,0,0,.22)!important;transition:transform .18s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease,opacity .15s!important; }
            #rareFloatBtn:hover { border-color:rgba(255,255,255,.14)!important;transform:scale(1.06)!important; }
            #rareFloatBtn svg { width:23px!important;height:23px!important;color:inherit!important;stroke:currentColor!important;fill:none!important;opacity:1!important;display:block!important; }
            #rareModal { --rare-accent:#3fbc87!important; --rare-accent-rgb:63,188,135!important; --rare-modal-bg:#121916!important; --rare-modal-bg-soft:#18221d!important; --rare-modal-bg-strong:#0e1411!important; --rare-modal-sidebar:rgba(17,24,20,.72)!important; --rare-modal-card:rgba(21,30,26,.72)!important;align-items:center!important;justify-content:center!important;padding:0!important;background:rgba(5,7,10,.86)!important;backdrop-filter:blur(7px)!important;-webkit-backdrop-filter:blur(7px)!important; }
            #rareModal .rareBox { width:1024px!important;max-width:95vw!important;height:624px!important;max-height:92vh!important;background:var(--rare-modal-bg)!important;color:#fff!important;border:1px solid rgba(255,255,255,.05)!important;border-radius:16px!important;box-shadow:0 24px 64px rgba(0,0,0,.8),inset 0 1px 1px rgba(255,255,255,.05)!important;display:grid!important;grid-template-columns:200px minmax(0,1fr)!important;grid-template-rows:52px minmax(0,1fr) 58px!important;overflow:hidden!important; }
            #rareModal .rareHead { grid-column:1 / -1!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:0 20px!important;background:var(--rare-modal-bg)!important;border-bottom:1px solid rgba(255,255,255,.03)!important; }
            #rareModal .rareHeadIcon { width:24px!important;height:24px!important;border-radius:0!important;background:none!important;color:var(--rare-accent)!important;display:flex!important;align-items:center!important;justify-content:center!important;filter:drop-shadow(0 0 4px rgba(var(--rare-accent-rgb),.15))!important; }
            #rareModal .rareHeadIcon svg { width:18px!important;height:18px!important; }
            #rareModal .rareHeadText { display:flex!important;align-items:center!important;gap:8px!important; }
            #rareModal .rareHeadText h3 { margin:0!important;color:var(--rare-accent)!important;font-family:"Trebuchet MS",Verdana,Arial,sans-serif!important;font-size:15px!important;font-weight:700!important;letter-spacing:.16em!important;text-transform:uppercase!important;text-shadow:0 0 14px rgba(var(--rare-accent-rgb),.22),0 1px 1px rgba(0,0,0,.55)!important; }
            #rareModal .rareClose { color:#627285!important;background:none!important;padding:0!important;border-radius:0!important;width:24px!important;height:24px!important; }
            #rareModal .rareClose:hover { color:#fff!important;background:none!important; }
            #rareModal .rareTabs { grid-column:1!important;grid-row:2!important;display:flex!important;flex-direction:column!important;justify-content:flex-start!important;padding:12px 10px 16px!important;background:var(--rare-modal-sidebar)!important;border-right:1px solid rgba(255,255,255,.03)!important;border-bottom:none!important;gap:2px!important;overflow-y:auto!important;overflow-x:hidden!important; }
            #rareModal .rareTab { width:100%!important;box-sizing:border-box!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;padding:9px 12px!important;background:transparent!important;color:#627285!important;border:0!important;border-left:2px solid transparent!important;border-radius:6px!important;font-size:13px!important;font-weight:500!important;line-height:1.2!important;text-align:left!important; }
            #rareModal .rareTabIcon { width:16px!important;height:16px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 16px!important;margin-right:10px!important;opacity:.72!important; }
            #rareModal .rareTabIcon svg { width:100%!important;height:100%!important;display:block!important; }
            #rareModal .rareTab:hover { color:#fff!important;background:rgba(255,255,255,.02)!important; }
            #rareModal .rareTab:hover .rareTabIcon { opacity:1!important; }
            #rareModal .rareTab.active { color:#fff!important;background:linear-gradient(90deg,rgba(var(--rare-accent-rgb),.10) 0%,rgba(0,0,0,0) 100%)!important;border-left-color:var(--rare-accent)!important;padding-left:10px!important; }
            #rareModal .rareTab.active .rareTabIcon { opacity:1!important;color:var(--rare-accent)!important; }
            #rareModal .rareBody { grid-column:2!important;grid-row:2!important;display:block!important;min-width:0!important;padding:16px 20px!important;background:var(--rare-modal-bg)!important;overflow-y:auto!important; }
            #rareModal .rareFoot { grid-column:1 / -1!important;grid-row:3!important;display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;padding:0 20px!important;background:var(--rare-modal-bg)!important;border-top:1px solid rgba(255,255,255,.03)!important; }
            #rareModal .rareSubTabs { display:flex!important;background:var(--rare-modal-bg-strong)!important;padding:3px!important;border-radius:8px!important;border:1px solid rgba(255,255,255,.03)!important;align-self:flex-start!important;width:100%!important;max-width:480px!important;gap:0!important;margin:0 0 14px!important; }
            #rareModal .rareSubTab { flex:1 1 0!important;background:none!important;border:none!important;padding:6px 12px!important;color:#627285!important;border-radius:6px!important;font-size:12px!important;font-weight:500!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important; }
            #rareModal .rareSubTab:hover { color:#fff!important;border-color:transparent!important; }
            #rareModal .rareSubTab.active { background:var(--rare-modal-bg-soft)!important;color:#fff!important;box-shadow:0 2px 8px rgba(0,0,0,.4)!important;border:1px solid rgba(255,255,255,.03)!important; }
            #rareModal .rareCard { background:var(--rare-modal-card)!important;border:1px solid rgba(255,255,255,.05)!important;border-radius:8px!important;padding:14px!important; }
            #rareModal .rareCard h4 { color:#fff!important;font-size:14px!important;font-weight:600!important; }
            #rareModal .rareCard .rareSubTxt,#rareModal .actIntro { color:#8fa0b5!important;font-size:11px!important;line-height:1.45!important; }
            #rareModal input,#rareModal select { background:var(--rare-modal-bg-strong)!important;color:#fff!important;border:1px solid rgba(255,255,255,.05)!important;border-radius:6px!important;outline:none!important; }
            #rareModal input:focus,#rareModal select:focus { border-color:rgba(var(--rare-accent-rgb),.5)!important;box-shadow:none!important; }
            #rareModal .rareInputRow { justify-content:space-between!important;align-items:flex-end!important;gap:8px!important; }
            #rareModal .rareInputRow input { padding:0 10px!important;height:28px!important;font-size:11px!important; }
            #rareModal .rareInputRow textarea, #rareModal .rareTextarea { min-height:86px!important;padding:8px 10px!important;font-size:11px!important; }
            #rareModal .rareAddBtn,#rareModal .rareBtnSave { background:var(--rare-accent)!important;border-color:var(--rare-accent)!important;color:#05070a!important;border-radius:6px!important; }
            #rareModal .rareAddBtn { width:28px!important;height:28px!important;font-size:18px!important; }
            #rareModal .rareBtn { padding:8px 18px!important;border:1px solid rgba(255,255,255,.05)!important;border-radius:6px!important;font-size:12px!important;font-weight:500!important; }
            #rareModal .rareBtnGhost { background:var(--rare-modal-bg-soft)!important;color:#fff!important;border-color:rgba(255,255,255,.06)!important; }
            #rareModal .rareBtnGhost:hover { background:color-mix(in srgb, var(--rare-modal-bg-soft) 82%, #fff 18%)!important;color:#fff!important;filter:none!important; }
            #rareModal .rareBtnCancel { background:var(--rare-modal-bg-soft)!important;color:#fff!important; }
            #rareModal .rareBtnCancel:hover { background:color-mix(in srgb, var(--rare-modal-bg-soft) 82%, #fff 18%)!important;color:#fff!important; }
            #rareModal .rareChip,#rareModal .actLevel { background:var(--rare-modal-card)!important;border:1px solid rgba(255,255,255,.05)!important;border-radius:8px!important; }
            #rareModal .rareChip { border-left:1px solid rgba(255,255,255,.05)!important; }
            #rareModal .rareChip .name,#rareModal .cstLabel,#rareModal .actPrev { color:#fff!important; }
            #rareModal .rareChip .del,#rareModal .actDel { color:#627285!important; }
            #rareModal .rareChip .del:hover,#rareModal .actDel:hover { color:#fff!important; }
            #rareModal .rareEmpty,#rareModal .actLevel .lvlInf,#rareModal .cstRangeVal { color:#627285!important; }
            #rareModal .rareHint { background:rgba(var(--rare-accent-rgb),.06)!important;border:1px solid rgba(var(--rare-accent-rgb),.14)!important;color:#8fa0b5!important;border-radius:8px!important; }
            #rareModal .rarePop { background:var(--rare-modal-bg)!important;border:1px solid rgba(255,255,255,.05)!important;box-shadow:0 24px 64px rgba(0,0,0,.55)!important;border-radius:12px!important; }
            #rareModal .rareSwatchCustom { background:var(--rare-modal-bg-soft)!important;border:1px solid rgba(255,255,255,.05)!important; }
            #rareModal .rareSwatchCustom:hover { background:color-mix(in srgb, var(--rare-modal-bg-soft) 82%, #fff 18%)!important;border-color:rgba(var(--rare-accent-rgb),.34)!important; }
            #rareModal .rareSwatchCustom .ccTxt { color:#fff!important; }
            #rareModal .cstRow { border-top:1px solid rgba(255,255,255,.04)!important; }
            #rareModal .cstSlider { background:#1b232e!important; }
            #rareModal .cstPreviewBtn { width:48px!important;height:48px!important;border-radius:16px!important;background:linear-gradient(180deg,rgba(41,161,107,.24),rgba(41,161,107,.12)),rgba(10,12,16,.78)!important;color:#f5f7fb!important;border:1px solid rgba(41,161,107,.30)!important;box-shadow:0 10px 34px rgba(41,161,107,.18)!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important; }
            #rareModal .cstPreviewBtn svg { width:20px!important;height:20px!important; }
            #rareModal .actAdd { border:1px solid rgba(255,255,255,.05)!important;color:#fff!important;background:var(--rare-modal-bg-soft)!important;border-radius:6px!important; }
            #rareModal .actAdd:hover { background:color-mix(in srgb, var(--rare-modal-bg-soft) 82%, #fff 18%)!important;color:#fff!important;border-color:rgba(255,255,255,.08)!important; }
            #rareModal .rareBody, #rareModal .rareList, #rareModal .rareTabs { scrollbar-color:rgba(var(--rare-accent-rgb),.38) transparent!important;scrollbar-width:thin!important; }
            #rareModal .rareBody::-webkit-scrollbar, #rareModal .rareList::-webkit-scrollbar, #rareModal .rareTabs::-webkit-scrollbar { width:8px!important; }
            #rareModal .rareBody::-webkit-scrollbar-track, #rareModal .rareList::-webkit-scrollbar-track, #rareModal .rareTabs::-webkit-scrollbar-track { background:transparent!important; }
            #rareModal .rareBody::-webkit-scrollbar-thumb, #rareModal .rareList::-webkit-scrollbar-thumb, #rareModal .rareTabs::-webkit-scrollbar-thumb { background:rgba(var(--rare-accent-rgb),.30)!important;border-radius:999px!important;border:2px solid transparent!important;background-clip:padding-box!important; }
            #rareModal .rareBody::-webkit-scrollbar-thumb:hover, #rareModal .rareList::-webkit-scrollbar-thumb:hover, #rareModal .rareTabs::-webkit-scrollbar-thumb:hover { background:rgba(var(--rare-accent-rgb),.50)!important;background-clip:padding-box!important; }
            @media (max-width:720px) { #rareModal { padding:0!important;align-items:stretch!important; } #rareModal .rareBox { width:100vw!important;max-width:none!important;height:100vh!important;max-height:none!important;border-radius:0!important;border:none!important;grid-template-columns:1fr!important;grid-template-rows:52px auto minmax(0,1fr) 58px!important; } #rareModal .rareHead { grid-column:1!important;grid-row:1!important;padding:0 14px!important; } #rareModal .rareTabs { grid-column:1!important;grid-row:2!important;flex-direction:row!important;overflow-x:auto!important;border-right:none!important;border-bottom:1px solid rgba(255,255,255,.03)!important;padding:8px!important;gap:4px!important; } #rareModal .rareTab { flex:0 0 auto!important;width:auto!important;border-left:none!important;border-radius:6px!important;padding:8px 10px!important;white-space:nowrap!important; } #rareModal .rareTab.active { padding-left:10px!important;border-left:none!important;background:rgba(var(--rare-accent-rgb),.10)!important; } #rareModal .rareBody { grid-column:1!important;grid-row:3!important;padding:14px!important; } #rareModal .rareFoot { grid-column:1!important;grid-row:4!important;padding:0 14px!important; } }
    `;
    const _CSS_STEAM_PANEL = `

            /* Панель редких игр Steam */
            .rarePanel,.rareSteamPanel { margin:0 0 22px;padding:14px;border:1px solid color-mix(in srgb, var(--rare-panel-color,#ffce14) 52%, rgba(255,255,255,.08));box-shadow:none;border-radius:14px;background-image:var(--rare-panel-bg-image,linear-gradient(180deg,rgba(255,206,20,.05),rgba(255,206,20,.01)),repeating-linear-gradient(31deg,rgba(255,255,255,.012) 0 2px,transparent 2px 19px),repeating-linear-gradient(117deg,rgba(255,206,20,.01) 0 1px,transparent 1px 23px),repeating-linear-gradient(73deg,rgba(255,255,255,.008) 0 1px,transparent 1px 29px));background-color:var(--rare-panel-bg,#12141a);background-clip:padding-box;box-sizing:border-box; }
            .rarePanelHead,.rareSteamPanelHead { display:flex;align-items:center;gap:8px;margin:0 0 14px;padding:0 2px; }
            .rareSteamGem { display:inline-flex;align-items:center;color:#ffce14; }
            .rarePanelTitle,.rareSteamPanelTitle { color:color-mix(in srgb, var(--rare-panel-color,#ffce14) 72%, #fff 28%);filter:saturate(1.5) brightness(1.5);text-shadow:0 1px 0 rgba(0,0,0,.42),0 0 20px color-mix(in srgb, var(--rare-panel-color,#ffce14) 54%, transparent);font-weight:900;font-size:14px;letter-spacing:.08em; }
            .rareSteamInfo { display:inline-flex;align-items:center;color:#8c8c8c;cursor:help; }
            .rareSteamGear { margin-left:auto;display:inline-flex;align-items:center;justify-content:center;color:#8c8c8c;cursor:pointer;transition:color .15s,background .15s,box-shadow .15s,border-color .15s;box-sizing:border-box;border:1px solid transparent;border-radius:999px;padding:5px; }
            .rarePanelActionBtn { display:inline-flex;align-items:center;justify-content:center;height:30px;padding:0 12px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(255,255,255,.04);color:#e9eef5;text-decoration:none;cursor:pointer;transition:transform .14s ease,filter .14s ease,border-color .14s ease,background .14s ease;box-sizing:border-box;font:700 12px/1 "Open Sans",Arial,sans-serif;letter-spacing:.04em;white-space:nowrap; }
            .rarePanelActionBtn:hover { transform:translateY(-1px);filter:brightness(1.04);border-color:rgba(255,255,255,.18);background:rgba(255,255,255,.07); }
            .rarePanelActionBtn:disabled { opacity:.72;cursor:default;transform:none; }
            .rareSteamGear svg { width:16px;height:16px; }
            .rareSteamGear svg, .rareSteamGear svg * { color:inherit!important;stroke:currentColor!important;fill:none!important;filter:none!important; }
            .rareSteamGrid { display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;align-items:start; }
            .rareSteamCard { --rare-shimmer-radius:12px; display:block;position:relative;width:100%;min-width:0;border:2px solid var(--rare-color,#ffce14);border-radius:12px;overflow:visible;background-color:#0e1013;background-image:none;text-decoration:none;transition:transform .12s;box-sizing:border-box; }
            .rareSteamCard:hover { transform:translateY(-2px); }
            .rareSteamCardImg { position:relative;width:100%;aspect-ratio:16/7;overflow:hidden;background:#0e1013;border-radius:10px 10px 0 0;z-index:1; }
            .rareSteamCardImg img { width:100%;height:100%;object-fit:cover;display:block; }
            .rareSteamCardInfo { min-width:0;padding:12px 14px;background:#0e1013;border-radius:0 0 10px 10px;position:relative;z-index:1; }
            .rareSteamCardName { color:#fff;font-weight:700;font-size:16px;line-height:1.25;margin:0 0 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
            .rareSteamCardHours { display:flex;align-items:center;gap:5px;color:#9aa0a6;font-size:13px; }
            .rareSteamCardHours svg { flex:0 0 auto;color:#9aa0a6; }
            .rareSteamMedalsGrid { grid-template-columns:repeat(auto-fit,minmax(102px,102px));justify-content:flex-start;gap:10px; }
            .rareSteamMedalWrap { position:relative;overflow:visible;border-radius:18px;transition:transform .16s ease; }
            .rareSteamMedalWrap:hover { transform:translateY(-2px); }
            .rareSteamMedalWrap::after { border-radius:18px; }
            .rareSteamMedalCard { position:relative;min-height:0;padding:0;border:2px solid var(--rare-color,#d8b35e);border-radius:18px;overflow:visible;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.018) 24%,rgba(255,255,255,.008) 100%),radial-gradient(circle at 50% 0%,color-mix(in srgb, var(--rare-color,#d8b35e) 18%, transparent),transparent 58%),#0d1117;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 10px 24px rgba(0,0,0,.22); transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease; }
            .rareSteamMedalCard:hover { transform:none; }
            .rareSteamMedalCard::after { content:none; }
            .rareSteamMedalCard.rareFxShimmer::before { z-index:7; }
            .rareSteamMedalCard .rareSteamCardImg { aspect-ratio:1/1;padding:14px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 42%,color-mix(in srgb, var(--rare-color,#d8b35e) 22%, transparent),transparent 42%),radial-gradient(circle at 50% 30%,rgba(255,255,255,.08),transparent 55%),transparent; }
            .rareSteamMedalCard .rareSteamCardImg, .rareSteamMedalCard .rareSteamCardImg img { position:relative;z-index:6; }
            .rareSteamMedalCard .rareSteamCardImg img { width:78%;height:78%;object-fit:contain;object-position:center center;display:block;filter:drop-shadow(0 0 14px color-mix(in srgb, var(--rare-color,#d8b35e) 30%, transparent)) drop-shadow(0 8px 16px rgba(0,0,0,.28)); }
            .rareSteamMedalCard .rareSteamCardInfo { display:none; }
            .rareSteamAllTitle { margin:2px 0 14px!important;color:#c9ccd1!important;font-weight:700!important;font-size:15px!important; }
            .rareBrawlGrid { display:grid!important;grid-template-columns:repeat(auto-fit,minmax(154px,154px))!important;gap:14px!important;align-items:start!important;justify-content:flex-start!important;padding:0!important;margin:0!important;list-style:none!important;float:none!important;width:100%!important;height:auto!important;max-height:none!important;overflow:visible!important; }
            .rareBrawlCard { width:154px!important;max-width:none!important;min-width:0!important;margin:0!important;float:none!important;display:block!important;list-style:none!important;border:2px solid var(--rare-color,#ffce14)!important;border-radius:12px!important;overflow:visible!important;background:#0e1013!important;box-sizing:border-box!important;padding:0!important; }
            .rareBrawlCard .supercellBrawler--top { position:relative!important;height:142px!important;min-height:142px!important;border-radius:10px 10px 0 0!important;overflow:hidden!important;display:flex!important;align-items:center!important;justify-content:center!important; }
            .rareBrawlCard .brawlerImg { display:block!important;width:auto!important;max-width:112px!important;height:118px!important;max-height:118px!important;object-fit:contain!important;margin:0 auto!important; }
            .rareBrawlCard .starPowersAndGadgets { position:absolute!important;left:6px!important;right:6px!important;bottom:6px!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:3px!important;flex-wrap:wrap!important;pointer-events:auto!important; }
            .rareBrawlCard .starPowersAndGadgets .entry { width:24px!important;height:24px!important;min-width:24px!important;margin:0!important;display:flex!important;align-items:center!important;justify-content:center!important; }
            .rareBrawlCard .starPowersAndGadget--img { width:24px!important;height:24px!important;max-width:24px!important;max-height:24px!important;object-fit:contain!important;display:block!important; }
            .rareBrawlCard .bottomContainer { display:block!important;margin:0!important;padding:8px 9px!important;background:#0e1013!important;color:#fff!important;text-align:left!important;white-space:normal!important;overflow:hidden!important;text-overflow:clip!important;border-radius:0 0 10px 10px!important; }
            .rareBrawlCard .bottomContainer .gameTitle { margin:0 0 5px!important;color:#fff!important;font-weight:800!important;font-size:13px!important;line-height:1.15!important;text-align:center!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important; }
            .rareBrawlCard .bottomContainer .gameHoursPlayed { display:flex!important;align-items:center!important;justify-content:center!important;gap:4px 6px!important;flex-wrap:wrap!important;color:#cfd3d8!important;font-size:12px!important;line-height:1.2!important;margin:0!important; }
            .rareBrawlCard .bottomContainer .gameHoursPlayed i { color:#8b94a3!important;font-size:12px!important; }
            .rareBrawlCard .bottomContainer .gameHoursPlayed .fa-bolt { color:#ffce14!important; }
            .rareBrawlCard .bottomContainer .gameHoursPlayed .stat { color:#fff!important;font-weight:800!important;margin-right:2px!important; }
            @media (max-width:900px) { .rareSteamGrid { grid-template-columns:repeat(2,1fr); } }
            @media (max-width:600px) { .rareSteamGrid { grid-template-columns:1fr; } }
    `;
    const _CSS_VALORANT = `
            /* Панель VALORANT — обычные карточки-клоны внутри, своя сетка */
            #rareValorantPanel .rareRiotGames { max-height:none!important;height:auto!important;overflow:visible!important;width:auto!important;padding:0!important;margin:0!important;background:transparent!important;border-radius:12px!important;position:relative!important;z-index:1!important; }
            #rareValorantPanel .rareRiotGames > ul { display:grid!important;grid-template-columns:repeat(3,1fr)!important;gap:12px!important;padding:0!important;margin:0!important;list-style:none!important;float:none!important;width:100%!important;height:auto!important;max-height:none!important;overflow:visible!important; }
            #rareValorantPanel .rareRiotGames > ul > li.item { width:auto!important;max-width:none!important;min-width:0!important;margin:0!important;float:none!important;display:block!important;box-sizing:border-box!important; }
            #rareValorantPanel .rareRiotGames > ul > li.rareItem { background:linear-gradient(#f5955b33,#f5955b33),#141414!important; }
            #rareValorantPanel .rareRiotGames > ul > li.rareItem.rank--1 { background:linear-gradient(#00958733,#00958733),#141414!important; }
            #rareValorantPanel .rareRiotGames > ul > li.rareItem.rank--2 { background:linear-gradient(#d1548d33,#d1548d33),#141414!important; }
            #rareValorantPanel .rareRiotGames > ul > li.rareItem.rank--3 { background:linear-gradient(#f5955b33,#f5955b33),#141414!important; }
            #rareValorantPanel .rareRiotGames > ul > li.rareItem.rank--4 { background:linear-gradient(#fad66333,#fad66333),#141414!important; }
            #rareValorantPanel .rareRiotGames.rareLolGames > ul { grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:10px!important; }
            #rareValorantPanel .rareRiotGames.rareLolGames > ul > li.item { min-width:0!important; }
            #rareValorantPanel .rareLolItem { border-radius:12px!important;background:#0e1013!important;overflow:visible!important; }
            #rareValorantPanel .rareLolItem img:first-of-type { width:100%!important;height:auto!important;display:block;border-radius:10px 10px 0 0!important; }
            #rareValorantPanel .rareRiotGames.rareLolGames .rareLolItem img:first-of-type { border-radius:8px 8px 0 0!important; }
            #rareValorantPanel .rareRiotGames.rareLolGames .rareLolItem .bottomContainer { margin:0!important;padding:6px 8px!important;background:#0e1013!important;border-radius:0 0 8px 8px!important;color:#fff!important;font-weight:700!important;font-size:12px!important;line-height:1.15!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important;min-height:27px!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important; }
            #rareValorantPanel .rareRiotGames.rareLolGames .rareLolItem .bottomContainer .bold { display:block!important;color:#fff!important;font-weight:700!important;font-size:12px!important;line-height:1.15!important;white-space:normal!important;overflow-wrap:anywhere!important;word-break:break-word!important;text-align:center!important; }
            #rareValorantPanel .rareRiotSections > div:last-child .rareSectionLogo { width:16px;height:16px; }
            #rareValorantPanel .rareRiotSections > div:last-child .rareSectionLogo svg { width:16px;height:16px; }
            #rareValorantPanel .rareItem, #rareValorantPanel .rareItem *, #rareValorantPanel .rareSteamPanelTitle { text-transform:none!important; font-family:inherit!important; }
            @media (max-width:600px) { #rareValorantPanel .rareRiotGames > ul { grid-template-columns:1fr!important; } }
    `;
    const _CSS_FORTNITE = `
            /* Панель Fortnite — компактные квадратные карточки */
            .rareCompactGrid,.rareFortniteGrid { display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px;align-items:start; }
            .rareCompactCard,.rareFortniteCard { --rare-shimmer-radius:10px; position:relative;border:none!important;border-radius:10px;overflow:visible;background:transparent!important;box-sizing:border-box;isolation:isolate; }
            .rareCompactCardImg,.rareFortniteCardImg { position:relative;width:100%;aspect-ratio:1/1;overflow:hidden;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;border-radius:10px;z-index:1; }
            .rareCompactCardImg img,.rareFortniteCardImg img { width:100%!important;height:100%!important;object-fit:contain!important;display:block!important;max-width:none!important;max-height:none!important;border-radius:0!important; }
            .rareCompactFrame { position:absolute;inset:0;border-radius:10px;box-shadow:inset 0 0 0 2px var(--rare-color,#9b59f6);pointer-events:none;z-index:7; }
            .rareFortniteCardInfo { display:none!important; }
            .rareFortniteCardInfo .bottomContainer { margin:0;width:100%; }
            .rareFortniteCardName { overflow:visible;text-overflow:clip;white-space:normal;display:block;line-height:1.2;overflow-wrap:anywhere;word-break:break-word;text-align:center; }
            .rareFortniteHoverName { position:absolute;left:0;right:0;bottom:0;min-height:46%;display:flex;align-items:flex-end;justify-content:center;padding:20px 10px 10px;border-radius:0 0 10px 10px;background:linear-gradient(180deg,rgba(8,10,14,0) 0%,rgba(8,10,14,.48) 36%,rgba(8,10,14,.82) 100%);color:#eef2f7;font-family:-apple-system,BlinkMacSystemFont,"Open Sans","Helvetica Neue",sans-serif;font-style:normal;font-weight:700;font-size:14px;line-height:1.22;letter-spacing:.01em;text-align:center;text-shadow:0 1px 1px rgba(0,0,0,.45),0 0 10px rgba(0,0,0,.34),0 0 18px rgba(255,255,255,.08);opacity:0;transform:translateY(6px);pointer-events:none;transition:opacity .18s ease,transform .18s ease;z-index:6;box-sizing:border-box;overflow-wrap:anywhere;word-break:break-word; }
            .rareFortniteCard:hover .rareFortniteHoverName { opacity:1;transform:translateY(0); }
            @media (max-width:600px) { .rareCompactGrid,.rareFortniteGrid { grid-template-columns:repeat(auto-fill,minmax(104px,1fr)); } }
            .rareMihoyoCardImg { position:relative;width:100%;aspect-ratio:1/1;overflow:hidden;border-radius:8px 8px 0 0;background:#12151b;z-index:1; }
            .rareMihoyoCardImg img { width:100%!important;height:100%!important;object-fit:cover!important;display:block!important; }
            .rareMihoyoBadge { position:absolute;z-index:2;display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:24px;padding:0 8px;border-radius:999px;font-weight:800;font-size:12px;line-height:1;background:rgba(12,14,18,.82);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.12);color:#fff; }
            .rareMihoyoBadge.rarity { left:8px;top:8px; }
            .rareMihoyoBadge.level { left:8px;bottom:8px; }
            .rareMihoyoBadge.fate { right:8px;top:8px; min-width:24px; padding:0 7px; }
            .rareMihoyoBadge.rarity.is-five { color:#ffd76a; }
            .rareMihoyoBadge.rarity.is-four { color:#c89bff; }
            .rareMihoyoBadge.rarity.is-s { color:#ffd76a; }
            .rareMihoyoBadge.rarity.is-a { color:#77c8ff; }
            .rareMihoyoSections { display:flex;flex-direction:column;gap:18px; }
            .rareMihoyoSectionTitle { margin:0 0 10px;padding:0 2px;color:color-mix(in srgb, var(--rare-panel-color,#ffce14) 72%, #fff 28%);filter:saturate(1.5) brightness(1.5);text-shadow:0 1px 0 rgba(0,0,0,.42),0 0 18px color-mix(in srgb, var(--rare-panel-color,#ffce14) 48%, transparent);font-size:14px;font-weight:900;letter-spacing:.06em;display:flex;align-items:center;justify-content:center; }
            .rareMihoyoSectionTitle .rareSectionLogo { width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center; }
            .rareMihoyoSectionTitle .rareSectionLogo svg { width:18px;height:18px;display:block;fill:currentColor; }
            /* Коллекции внутри золотой панели (аккордеон) — нативный тёмный стиль */
            .rareCollections { display:flex;flex-direction:column;gap:12px; }
            .rareCollection { --rare-shimmer-border:1.8px; --rare-shimmer-radius:16px; --rare-hover-tail:0px; border:1.5px solid rgba(255,255,255,.05);border-radius:16px;background-color:#12141a;position:relative;isolation:isolate;overflow:visible; }
            .rareCollection::after { content:'';position:absolute;left:0;right:0;top:0;bottom:calc(-1 * var(--rare-hover-tail));border-radius:16px 16px calc(16px + var(--rare-hover-tail)) calc(16px + var(--rare-hover-tail));pointer-events:none;opacity:0;transition:opacity .35s ease;background:radial-gradient(340px circle at var(--mouse-x,50%) var(--mouse-y,50%), rgba(255,255,255,.07), transparent 50%);clip-path:inset(0 0 var(--rare-hover-clip, 0) 0 round 16px);z-index:2; }
            .rareCollection.rareHoverActive::after { opacity:1; }
            .rareCollection.rareHoverActive { border-color:var(--rare-color,#fff)!important; }
            .rareCollectionHead { display:flex;align-items:center;gap:10px;padding:14px 18px;cursor:pointer;user-select:none; }
            .rareCollectionGem { display:inline-flex;align-items:center;color:var(--rare-color,#8f7dff);flex:0 0 auto; }
            .rareCollectionGem svg { width:20px;height:20px; }
            .rareCollectionGemImg img { width:22px;height:22px;object-fit:contain;display:block; }
            .rareCollectionName { color:#fff;font-weight:800;font-size:15px;letter-spacing:.02em;text-transform:uppercase;white-space:nowrap; }
            .rareFortniteCardName { text-transform:uppercase; }
            .rareCollectionCount { display:inline-flex;align-items:center;justify-content:center;min-width:19px;padding:3px 5px;border-radius:9px;background:rgba(143,125,255,.18);color:#b9adff;font-weight:800;font-size:12px; }
            .rareCollectionCountLbl { color:#7d828c;font-size:13px;font-weight:500; }
            .rareCollectionArrow { margin-left:auto;display:inline-flex;align-items:center;color:#7d828c;transition:transform .2s;cursor:pointer; }
            .rareCollection.open .rareCollectionArrow { transform:rotate(180deg); }
            .rareCollectionBody { display:none;padding:0 18px 18px; }
            .rareCollection.open { --rare-hover-tail:42px; --rare-hover-clip:-42px; }
            .rareCollection.open .rareCollectionBody { display:block; }
            .rareCollectionGames { max-height:none!important;height:auto!important;overflow:visible!important;width:auto!important;padding:0!important;margin:0!important; }
            .rareCollectionGames > ul { display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:14px!important;padding:0!important;margin:0!important;list-style:none!important;float:none!important;width:100%!important;height:auto!important;max-height:none!important;overflow:visible!important; }
            .rareCollectionGames > ul > li.item { width:auto!important;max-width:none!important;min-width:0!important;margin:0!important;float:none!important;display:block!important;box-sizing:border-box!important; }
            /* Карточки скинов — родная картинка на тёмной плашке, без обводки, с родным названием */
            .rareCollectionGames > ul > li.rareCollItem { border:none!important;border-radius:14px!important;background:#1b1e26!important;padding:10px 12px!important;box-shadow:none!important;overflow:hidden!important;box-sizing:border-box!important; }
            .rareCollectionGames > ul > li.rareCollItem img { width:100%!important;height:auto!important;object-fit:contain!important;display:block!important;margin:0 auto!important; }
            .rareCollectionGames > ul > li.rareCollItem .bottomContainer { display:block!important;margin-top:8px!important;color:#fff!important;font-weight:700!important;font-size:13px!important;text-align:center!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important; }
            .rareAutoTitleBtn { display:inline-flex;align-items:center;justify-content:center;gap:0;width:30px;height:30px;min-width:30px;margin:0 8px 0 10px;padding:0;border:1px solid rgba(var(--rare-auto-title-rgb,0,186,120),.34);border-radius:10px;background:linear-gradient(180deg,rgba(var(--rare-auto-title-rgb,0,186,120),.18),rgba(var(--rare-auto-title-rgb,0,186,120),.06)),var(--rare-auto-title-bg,rgba(18,22,28,.92));box-shadow:0 10px 24px rgba(0,0,0,.20);color:var(--rare-auto-title-fg,#f3f7fb);cursor:pointer;vertical-align:middle;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,filter .16s ease,opacity .16s ease;position:relative;overflow:hidden; }
            .rareAutoTitleBtn::before { content:'';position:absolute;inset:0;background:linear-gradient(120deg,transparent 0%,rgba(255,255,255,.14) 18%,transparent 42%);transform:translateX(-140%);transition:transform .5s ease;pointer-events:none; }
            .rareAutoTitleBtn:hover { border-color:rgba(var(--rare-auto-title-rgb,0,186,120),.46);box-shadow:0 14px 30px rgba(0,0,0,.24),0 0 24px rgba(var(--rare-auto-title-rgb,0,186,120),.16);filter:brightness(1.03); }
            .rareAutoTitleBtn:hover::before { transform:translateX(140%); }
            .rareAutoTitleBtn:disabled { opacity:.7;cursor:default;transform:none; }
            .rareAutoTitleBtn:disabled::before { display:none; }
            .rareAutoTitleBtnIcon { width:17.6px;height:17.6px;display:flex;align-items:center;justify-content:center;position:relative;z-index:1;color:inherit;fill:currentColor;flex:0 0 auto;filter:drop-shadow(0 1px 1px rgba(0,0,0,.22)); }
            .rareAutoTitleBtnIcon svg { width:100%;height:100%;display:block;fill:currentColor;transform:translate(.65px,.25px); }
            @media (max-width:900px) { .rareCollectionGames > ul { grid-template-columns:repeat(3,1fr)!important; } }
            @media (max-width:600px) { .rareCollectionGames > ul { grid-template-columns:repeat(2,1fr)!important; } }
    `;
    const _CSS_FUNPAY = `
            .rareFunpayBtn { display:inline-flex;align-items:center;gap:6px;height:30px;margin:0 6px;padding:0 12px;border:1px solid rgba(var(--rare-fp-rgb,0,186,120),.4);border-radius:10px;background:linear-gradient(180deg,rgba(var(--rare-fp-rgb,0,186,120),.2),rgba(var(--rare-fp-rgb,0,186,120),.07)),var(--rare-fp-bg,rgba(18,22,28,.92));color:var(--rare-fp-fg,#f3f7fb);font:700 12px/1 "Open Sans",Arial,sans-serif;letter-spacing:.03em;cursor:pointer;vertical-align:middle;transition:transform .16s ease,filter .16s ease,border-color .16s ease,opacity .16s ease; }
            .rareFunpayBtn:hover { filter:brightness(1.06);border-color:rgba(var(--rare-fp-rgb,0,186,120),.55);transform:translateY(-1px); }
            .rareFunpayBtn:disabled { opacity:.6;cursor:default;transform:none; }
            .rareFunpayBtn.is-busy { animation:rareFpPulse 1.1s ease-in-out infinite; }
            .rareFunpayBtnIcon { display:inline-flex;align-items:center; }
            @keyframes rareFpPulse { 0%,100% { filter:brightness(1); } 50% { filter:brightness(1.35); } }
            .rareFunpayView .rareSubTabs { margin:6px 0 12px; }
            .rareFpCat { margin-top:4px; }
            .rareFunpayHistory { display:flex;flex-direction:column;gap:8px;max-height:340px;overflow:auto; }
            .rareFpRow { border:1px solid rgba(255,255,255,.08);border-left-width:3px;border-radius:10px;padding:9px 11px;background:rgba(255,255,255,.02); }
            .rareFpRow.is-ok { border-left-color:#00ba78; }
            .rareFpRow.is-warn { border-left-color:#ffce14; }
            .rareFpRow.is-err { border-left-color:#ff5c5c; }
            .rareFpRowHead { display:flex;align-items:center;gap:8px;font-size:11px;color:#9aa0aa;margin-bottom:4px; }
            .rareFpBadge { font-weight:800;letter-spacing:.03em;text-transform:uppercase; }
            .rareFpCheckNote { color:#ffce14;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.02em;padding:2px 6px;border:1px solid rgba(255,206,20,.4);border-radius:5px;background:rgba(255,206,20,.1); }
            .rareFpRow.is-ok .rareFpBadge { color:#00ba78; }
            .rareFpRow.is-warn .rareFpBadge { color:#ffce14; }
            .rareFpRow.is-err .rareFpBadge { color:#ff5c5c; }
            .rareFpGame { margin-left:auto; }
            .rareFpTitle { color:#e9eef5;font-weight:600;font-size:13px;overflow-wrap:anywhere; }
            .rareFpLinks { margin-top:7px;display:flex;flex-wrap:wrap;gap:7px; }
            .rareFpLinkBtn { display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:8px;font-size:12px;font-weight:700;letter-spacing:.02em;text-decoration:none;line-height:1;border:1px solid rgba(var(--rare-accent-rgb,63,188,135),.34);background:linear-gradient(180deg,rgba(var(--rare-accent-rgb,63,188,135),.16),rgba(var(--rare-accent-rgb,63,188,135),.06));color:#eef3f8;transition:background .15s ease,border-color .15s ease,box-shadow .15s ease; }
            .rareFpLinkBtn:hover { text-decoration:none;background:linear-gradient(180deg,rgba(var(--rare-accent-rgb,63,188,135),.28),rgba(var(--rare-accent-rgb,63,188,135),.12));border-color:rgba(var(--rare-accent-rgb,63,188,135),.6);box-shadow:0 6px 16px rgba(var(--rare-accent-rgb,63,188,135),.18); }
            .rareFpLinkIco { display:inline-flex;width:13px;height:13px;flex:0 0 auto;opacity:.9; }
            .rareFpLinkIco svg { width:13px;height:13px;display:block; }
            .rareFpLinkBtn.is-lzt { border-color:rgba(255,206,20,.34);background:linear-gradient(180deg,rgba(255,206,20,.15),rgba(255,206,20,.05));color:#ffe9a6; }
            .rareFpLinkBtn.is-lzt:hover { text-decoration:none;border-color:rgba(255,206,20,.6);background:linear-gradient(180deg,rgba(255,206,20,.26),rgba(255,206,20,.1));box-shadow:0 6px 16px rgba(255,206,20,.16); }
            .rareFpMsg { margin-top:4px;font-size:12px;color:#c58b8b;overflow-wrap:anywhere; }
            #rareModal .rareFpField { display:flex;flex-direction:column;gap:5px;margin-bottom:12px; }
            #rareModal .rareFpLabel { font-size:12px;font-weight:600;color:#b9c0cb;letter-spacing:.01em; }
            #rareModal .rareFpField input, #rareModal .rareFpField textarea { width:100%;background:var(--rare-modal-bg-strong,#101214);color:#eee;border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:10px 12px;font:13px/1.45 inherit;outline:none;resize:vertical;box-sizing:border-box;transition:border-color .15s; }
            #rareModal .rareFpField textarea { min-height:92px;font-size:12px; }
            #rareModal .rareFpField input:focus, #rareModal .rareFpField textarea:focus { border-color:var(--rare-accent); }
            #rareModal .rareFpVars { display:flex;flex-wrap:wrap;gap:7px;margin:2px 0 14px; }
            #rareModal .rareFpVar { display:inline-flex;align-items:center;padding:5px 10px;border:1px solid rgba(var(--rare-accent-rgb,63,188,135),.32);border-radius:8px;background:linear-gradient(180deg,rgba(var(--rare-accent-rgb,63,188,135),.14),rgba(var(--rare-accent-rgb,63,188,135),.05)),var(--rare-modal-card,rgba(24,18,16,.74));color:#e9eef5;cursor:pointer;transition:transform .14s ease,border-color .14s ease,filter .14s ease;font:inherit; }
            #rareModal .rareFpVar:hover { transform:translateY(-1px);border-color:rgba(var(--rare-accent-rgb,63,188,135),.6);filter:brightness(1.08); }
            #rareModal .rareFpVar:active { transform:translateY(0); }
            #rareModal .rareFpVar.is-copied { border-color:var(--rare-accent);box-shadow:0 0 0 2px rgba(var(--rare-accent-rgb,63,188,135),.28); }
            #rareModal .rareFpVar code { font:600 12px/1 "SFMono-Regular",Consolas,monospace;color:var(--rare-accent,#3fbc87);letter-spacing:.01em; }

    `;
    const _RARE_STYLES = [_CSS_ITEMS, _CSS_FLOAT_BTN, _CSS_PANEL, _CSS_MODAL_BASE, _CSS_TOAST, _CSS_ACTIVITY, _CSS_CUSTOM, _CSS_REDESIGN, _CSS_STEAM_PANEL, _CSS_VALORANT, _CSS_FORTNITE, _CSS_FUNPAY].join('');
    function injectStyles() {
        if (document.getElementById('rareSkinsStyles')) return;
        const st = document.createElement('style');
        st.id = 'rareSkinsStyles';
        st.textContent = _RARE_STYLES;
        document.head.appendChild(st);
    }

    const gearSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
    const marketSvg = () => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13 5.4 5M7 13l-2.3 4.6A1 1 0 0 0 5.6 19H19"/><circle cx="9" cy="21" r="1"/><circle cx="18" cy="21" r="1"/></svg>`
    const uploaderSvg = () => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3"/><path d="m7 8 5-5 5 5"/><path d="M20 21H4a2 2 0 0 1-2-2v-2"/><path d="M22 17v2"/></svg>`
    const closeSvg = () => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`
    const checkSvg = () => `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>`
    const plusSvg = () => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`
    const delSvg = () => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>`
    const trashSvg = () => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`
    const wandSvg = () => `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>`
    // Иконка «6 точек» — ручка перетаскивания для приоритета порядка редких.
    const gripSvg = () => `<svg viewBox="0 0 24 24" width="18.5" height="18.5" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>`
    const valorantLogoSvg = () => `<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M19.8 26.1h-0.2c-2.4 0-4.8 0-7.2 0-0.3 0-0.5-0.1-0.6-0.3-2.5-3.2-5.1-6.3-7.6-9.5C4.1 16.1 4 16 4 15.8c0-3.1 0-6.1 0-9.2 0-0.1 0-0.2 0.1-0.2h0.1c5.2 6.5 10.4 13 15.5 19.5 0 0 0 0.1 0.1 0.1Z"/><path d="M27.8 16.3c-0.7 0.9-1.5 1.8-2.2 2.8-0.2 0.2-0.4 0.3-0.6 0.3-2.4 0-4.8 0-7.1 0 0 0-0.1 0-0.1 0-0.1 0-0.2-0.1-0.1-0.2 0 0 0-0.1 0.1-0.1 2.4-3 4.7-5.9 7.1-8.9 1-1.2 2-2.5 2.9-3.7 0-0.1 0.1-0.1 0.2-0.1 0 0 0.1 0 0.1 0 0 0.1 0 0.1 0 0.2 0 3 0 6.1 0 9.1 0 0.3-0.1 0.5-0.2 0.6Z"/></svg>`
    const fortniteLogoSvg = () => `<svg viewBox="0 0 192 192" fill="none" stroke="currentColor" stroke-width="12" stroke-linejoin="round" aria-hidden="true"><path d="M121.62 56.15H98.85v17.08l5.69 5.69h17.08v28.46H98.85v51.24l-28.47 5.69V27.69h56.93Z"/><path d="m22 33.38 8.54 28.47L22 152.92l48.39-8.08V33.38H22zm142.31 28.47L170 33.38h-43.83l-4.56 22.77H98.85v17.08l5.69 5.69h17.07v28.47H98.85v34.77l71.15 5.07-5.69-85.38z"/></svg>`
    const genshinLogoSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" fill="currentColor" aria-hidden="true"><g transform="translate(0,320) scale(0.1,-0.1)"><path d="M2639 2789 c-123 -62 -174 -211 -115 -334 45 -94 115 -137 225 -136 81 0 129 19 181 71 38 38 70 114 70 167 0 95 -57 191 -136 228 -66 31 -169 33 -225 4z"/><path d="M615 2104 c-218 -31 -417 -217 -455 -426 -7 -35 -10 -252 -8 -590 l3 -535 35 -46 c51 -67 99 -91 185 -91 76 -1 129 20 173 68 51 56 52 61 52 553 0 425 2 461 19 499 69 152 268 142 311 -15 7 -26 10 -198 10 -484 -1 -496 -2 -488 68 -560 66 -68 180 -84 270 -38 41 21 67 48 97 101 19 33 20 60 25 515 6 532 3 514 73 562 56 39 130 39 181 -1 72 -55 70 -44 76 -406 4 -271 8 -331 21 -360 9 -19 23 -50 30 -69 24 -63 105 -176 160 -222 74 -62 174 -116 250 -134 83 -19 248 -19 324 0 110 28 183 73 280 170 80 79 95 100 127 175 20 47 42 115 47 150 15 93 14 887 -1 948 -22 89 -120 162 -218 162 -95 0 -196 -71 -219 -155 -7 -26 -11 -184 -11 -461 l0 -421 -29 -39 c-34 -48 -66 -70 -114 -79 -69 -13 -143 31 -174 103 -10 24 -14 110 -17 355 -3 249 -7 334 -19 377 -30 106 -61 160 -143 242 -206 207 -555 208 -763 0 -86 -86 -104 -85 -194 6 -27 28 -61 56 -75 63 -15 7 -38 21 -52 30 -57 38 -231 66 -325 53z"/></g></svg>`
    const steamLogoSvg = () => `<svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><path d="M18.102 12.129c0-1.564 1.268-2.831 2.831-2.831s2.831 1.268 2.831 2.831c0 1.564-1.267 2.831-2.831 2.831-1.563 0-2.83-1.267-2.83-2.83zM24.691 12.135c0-2.081-1.687-3.768-3.768-3.768s-3.768 1.687-3.768 3.768c0 2.081 1.687 3.768 3.768 3.768 2.08-.003 3.765-1.688 3.768-3.767zM10.427 23.76l-1.841-.762c.524 1.078 1.611 1.808 2.868 1.808 1.317 0 2.448-.801 2.93-1.943.155-.362.246-.784.246-1.226 0-1.757-1.424-3.181-3.181-3.181-.405 0-.792.076-1.148.213l.022-.007 1.903.787c.852.364 1.439 1.196 1.439 2.164 0 1.296-1.051 2.347-2.347 2.347-.324 0-.632-.066-.913-.184zM15.974 1.004c-7.857.001-14.301 6.046-14.938 13.738l8.034 3.376c.668-.462 1.495-.737 2.387-.737.079 0 .156.005.235.008l3.575-5.176v-.074c.003-3.12 2.533-5.648 5.653-5.648 3.122 0 5.653 2.531 5.653 5.653s-2.531 5.653-5.653 5.653h-.131l-5.094 3.638c0 .065.005.131.005.199 0 2.342-1.899 4.241-4.241 4.241-2.047 0-3.756-1.451-4.153-3.38l-5.76-2.41c1.841 6.345 7.601 10.905 14.425 10.905 8.281 0 14.994-6.713 14.994-14.994S24.255 1.004 15.974 1.004z"/></svg>`
    const ubisoftLogoSvg = () => `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.561 11.989C23.301-.304 6.953-4.89.655 6.634c.282.206.661.477.943.672a11.748 11.748 0 0 0-.976 3.068 11.886 11.886 0 0 0-.184 2.071c0 6.374 5.182 11.556 11.567 11.556s11.556-5.171 11.556-11.556v-.455zM3.29 14.048c-.152 1.247-.054 1.637-.054 1.789l-.282.098c-.108-.206-.369-.932-.488-1.908-.304-3.718 2.233-7.068 6.103-7.697 3.545-.52 6.938 1.68 7.729 4.759l-.282.098c-.087-.087-.228-.336-.77-.878-4.282-4.282-11.003-2.32-11.957 3.74zm11.003 2.082a3.145 3.145 0 0 1-2.591 1.355 3.151 3.151 0 0 1-3.155-3.155 3.159 3.159 0 0 1 2.927-3.144c1.019-.043 1.973.51 2.417 1.398a2.58 2.58 0 0 1-.455 2.949c.293.206.575.401.856.596zm6.58.119c-1.669 3.783-5.106 5.767-8.77 5.713-7.035-.347-9.084-8.466-4.38-11.393l.206.206c-.076.108-.358.325-.791 1.182-.51 1.041-.672 2.081-.607 2.732.369 5.67 8.315 6.83 11.046 1.214C21.057 8.217 11.821.401 3.625 6.374l-.184-.184c2.157-3.382 6.374-4.889 10.396-3.881 6.147 1.55 9.453 7.957 7.035 13.941z"/></svg>`
    const tanksLogoSvg = () => `<svg viewBox="0 0 1104.586 1511.305" fill="currentColor" aria-hidden="true"><path d="M980.83 320.625 880.432 218.694 772.637 112.111H331.949L226.946 218.694 126.548 320.625h321.275v920.68l105.875 104.697 105.855-104.697v-920.68h.02z"/><path d="M876.758 420.251H775.692v410.793L670.098 935.38l74.357 72.191 75.098 72.943 161.602-159.801.037-500.462zM331.726 831.044V420.251H126.201v500.462l161.664 159.801 75.099-72.943 74.312-72.191z"/><path d="M316.11 55.984 56.036 315.941V946.07l496.271 487.021 496.251-487.021V315.96L788.496 55.984H316.11zM8.304 284.584 284.914 8.24 293.096 0h518.379l8.18 8.24 276.629 276.344 8.303 8.316v676.439l-8.406 8.229-524.299 514.538-19.574 19.197-19.6-19.197L8.429 977.571 0 969.341V292.905l8.304-8.321z"/></svg>`
    const gemSvg = () => `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 2h12l4 6-10 14L2 8l4-6zm.6 2L4.2 7.6h4.5L10 4H6.6zm7.4 0-1.3 3.6h4.5L14.9 4H14zm-1.9 0h-.2L10.6 7.6h2.8L12.1 4zM4.6 9.6 10.9 18 8.3 9.6H4.6zm5.5 0L12 16.4l1.9-6.8h-3.8zm5.6 0-2.6 8.4 6.3-8.4h-3.7z"/></svg>`
    const statsSvg = () => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10"/><path d="M12 20V4"/><path d="M20 20v-7"/></svg>`
    const refreshSvg = () => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>`
    const chevronSvg = () => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`
    const clockSvg = () => `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`
    const magicSparklesSvg = () => `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M18 11a1 1 0 0 1-1 1 5 5 0 0 0-5 5 1 1 0 0 1-2 0 5 5 0 0 0-5-5 1 1 0 0 1 0-2 5 5 0 0 0 5-5 1 1 0 0 1 2 0 5 5 0 0 0 5 5 1 1 0 0 1 1 1Z"/><path d="M19 24a1 1 0 0 1-1 1 2 2 0 0 0-2 2 1 1 0 0 1-2 0 2 2 0 0 0-2-2 1 1 0 0 1 0-2 2 2 0 0 0 2-2 1 1 0 0 1 2 0 2 2 0 0 0 2 2 1 1 0 0 1 1 1Z"/><path d="M28 17a1 1 0 0 1-1 1 4 4 0 0 0-4 4 1 1 0 0 1-2 0 4 4 0 0 0-4-4 1 1 0 0 1 0-2 4 4 0 0 0 4-4 1 1 0 0 1 2 0 4 4 0 0 0 4 4 1 1 0 0 1 1 1Z"/></svg>`

    function makeDraft(key) {
        return { items: CATEGORIES[key].wanted.map(x => Object.assign(
            { name: x.name, color: x.color, effect: x.effect || 'none' },
            key === 'brawl' ? { minPower: Math.max(0, parseInt(x.minPower, 10) || 0) } : {}
        )) };
    }
    const buildTabHtml = (tab, iconFn, label) => '<button class="rareTab" data-tab="' + tab + '"><span class="rareTabIcon">' + iconFn() + '</span><span>' + label + '</span></button>';
    const buildSubTabsHtml = (subs) => '<div class="rareSubTabs">' + subs.map(s => '<button class="rareSubTab" data-sub="' + s.key + '">' + s.label + '</button>').join('') + '</div>';
    function buildItemViewHtml(tab, subTabsHtml, hidden) {
        return '<div class="rareItemsView" data-view="' + tab + '"' + (hidden ? ' style="display:none"' : '') + '>'
            + (subTabsHtml || '')
            + '<div class="rareCol"><div class="rareCard">'
            + '<h4><span class="rareListTitle"></span><span class="rareListHeadActions"><button type="button" class="rareIconBtn rareListDefaults" title="Загрузить готовую базу, добавляет скины уже к вашим существующим" style="display:none">' + wandSvg() + '</button><button type="button" class="rareIconBtn rareIconBtnDanger rareListClear" title="Очистить список">' + trashSvg() + '</button></span></h4>'
            + '<p class="rareSubTxt rareListDesc"></p>'
            + '<p class="rareSubTxt rareListPriorityNote">Редкие предметы показываются в том же порядке (приоритете), как вы выставили их в списке — перетаскивайте за иконку слева. Этот порядок используется и в автоназвании, и при автозагрузке лота на FunPay.</p>'
            + '<div class="rareInputRow"><input type="text" class="rareInput" placeholder="" maxlength="80"><button class="rareAddBtn" title="Добавить">+</button></div>'
            + '<div class="rareLevelFilter" style="display:none">'
            +   '<label class="rareLevelToggle"><input type="checkbox" class="rareLevelEnabled"><span>Минимальный уровень</span></label>'
            +   '<div class="rareLevelRow"><span class="rareLevelLbl">Мин. уровень</span><input type="number" min="1" max="999" class="rareLevelMin" placeholder="напр. 80"></div>'
            + '</div>'
            + '<div class="rareList"></div>'
            + '</div></div></div>';
    }
    const _settingsValSubTabs  = buildSubTabsHtml([{ key: 'skins', label: 'Скины' }, { key: 'buddies', label: 'Брелки' }]);
    const _settingsMihSubTabs  = buildSubTabsHtml([{ key: 'genshin', label: 'Genshin' }, { key: 'honkai', label: 'Honkai' }, { key: 'zenless', label: 'Zenless' }]);
    const _settingsSteamSubTabs = buildSubTabsHtml([{ key: 'steam', label: 'Игры' }, { key: 'steammedals', label: 'Медали' }]);
    const _settingsTabsHtml = [
        buildTabHtml('steam',     steamLogoSvg,    'Steam'),
        buildTabHtml('fortnite',  fortniteLogoSvg, 'Fortnite'),
        buildTabHtml('valorant',  valorantLogoSvg, 'VALORANT'),
        buildTabHtml('lol',       leagueLogoSvg,   'League of Legends'),
        buildTabHtml('mihoyo',    genshinLogoSvg,  'miHoYo'),
        buildTabHtml('supercell', statsSvg,        'Supercell'),
        buildTabHtml('tanks',     tanksLogoSvg,    'Wolrd of tanks'),
        buildTabHtml('ubisoft',   ubisoftLogoSvg,  'Rainbow Six'),
        buildTabHtml('funpay',    uploaderSvg,     'Uploader'),
        buildTabHtml('activity',  clockSvg,        'Активность'),
        buildTabHtml('stats',     statsSvg,        'Статистика'),
        buildTabHtml('custom',    gearSvg,         'Настройки'),
    ].join('');
    const _settingsItemViewsHtml = [
        buildItemViewHtml('valorant',  _settingsValSubTabs,   false),
        buildItemViewHtml('lol',       null,                  true),
        buildItemViewHtml('fortnite',  null,                  true),
        buildItemViewHtml('mihoyo',    _settingsMihSubTabs,   true),
        buildItemViewHtml('steam',     _settingsSteamSubTabs, true),
        buildItemViewHtml('supercell', null,                  true),
        buildItemViewHtml('tanks',     null,                  true),
        buildItemViewHtml('ubisoft',   null,                  true),
    ].join('');

    // Одна вкладка Uploader: golden_key + подтабы категорий + история.
    const _funpaySubTabsHtml = buildSubTabsHtml(FUNPAY_ADAPTER_KEYS.map(k => ({ key: k, label: FUNPAY_ADAPTERS[k].label })));
    const _funpayField = (labelText, control) => '<div class="rareFpField"><label class="rareFpLabel">' + labelText + '</label>' + control + '</div>';
    // Плейсхолдеры-подстановки, кликом копируются в поле. Тултип поясняет значение.
    const FUNPAY_PLACEHOLDERS = [
        { tag: '{count}', hint: 'Количество скинов + слово (RU: «150 скинов» со склонением, EN: «150 skins»)' },
        { tag: '{rare}',  hint: 'Список редких предметов через запятую' },
        { tag: ' | ',     hint: 'Разделитель' }
    ];
    const _funpayPlaceholdersHtml = '<div class="rareFpVars">'
        + FUNPAY_PLACEHOLDERS.map(p => '<button type="button" class="rareFpVar" data-var="' + p.tag + '" title="' + escHtml(p.hint) + '"><code>' + escHtml(p.tag) + '</code></button>').join('')
        + '</div>';
    function _funpayCategoryPanelHtml(key) {
        return '<div class="rareFpCat" data-fpcat="' + key + '" style="display:none">'
            + _funpayPlaceholdersHtml
            + _funpayField('Название на русском', '<input type="text" class="fpSummaryRu">')
            + _funpayField('Название на английском', '<input type="text" class="fpSummaryEn">')
            + _funpayField('Подробное описание на русском', '<textarea class="fpDescRu" rows="4"></textarea>')
            + _funpayField('Подробное описание на английском', '<textarea class="fpDescEn" rows="4"></textarea>')
            + '</div>';
    }
    const _funpayViewHtml = '<div class="rareItemsView rareFunpayView" data-view="funpay" style="display:none">'
        + '<div class="rareCol">'
        + '<div class="rareCard cstCardTight"><h4>Uploader</h4>'
        + '<p class="rareSubTxt">golden_key из cookie авторизованного аккаунта FunPay.</p>'
        + '<div class="rareInputRow"><input type="password" class="fpGoldenKey" autocomplete="off"></div>'
        + '<p class="rareSubTxt rareFpWarnNote">Загрузка на FunPay идёт через ЭТОТ браузер и его IP/прокси, а не через отдельный браузер, где у вас открыт FunPay. Если вы используете антик с прокси, то залогиньтесь на маркет через него и установите скрипт там.</p></div>'
        + '<div class="rareCard cstCardTight"><h4>Настройки категории</h4>'
        + _funpaySubTabsHtml
        + FUNPAY_ADAPTER_KEYS.map(_funpayCategoryPanelHtml).join('')
        + '</div>'
        + '<div class="rareCard cstCardTight"><h4>История публикаций</h4>'
        + '<div class="rareFunpayHistory"></div></div>'
        + '</div></div>';

    const _SETTINGS_TAB_MAP = { activity:'activity', fortnite:'fortnite', lol:'lol', supercell:'supercell', tanks:'tanks', ubisoft:'ubisoft' };

    function openSettings(startCat, startTab) {
        if (document.getElementById('rareModal')) return;
        injectStyles();
        const drafts = Object.fromEntries(CONFIG_CATEGORY_KEYS.map(k => [k, makeDraft(k)]));
        let actDraft = ACT_LEVELS.map(l => ({ min: l.min, max: l.max, color: l.color, effect: l.effect }));
        let customDraft = Object.assign({}, CUSTOM);
        let apiDraft = Object.assign({}, API_SETTINGS);
        let funpayDraft = normalizeFunpayUploader(FUNPAY);

        let valSub = 'skins', mihoyoSub = 'genshin', steamSub = 'steam', funpaySub = FUNPAY_ADAPTER_KEYS[0], activeTab = 'valorant';
        if (startTab === 'funpay') activeTab = 'funpay';
        else if (startCat) {
            const tk = startCat.tabKey;
            if (_SETTINGS_TAB_MAP[tk]) activeTab = _SETTINGS_TAB_MAP[tk];
            else if (tk === 'mihoyo') { activeTab = 'mihoyo'; mihoyoSub = startCat === CATEGORIES.honkai ? 'honkai' : startCat === CATEGORIES.zenless ? 'zenless' : 'genshin'; }
            else if (tk === 'steam')  { activeTab = 'steam';  steamSub  = startCat === CATEGORIES.steammedals ? 'steammedals' : 'steam'; }
            else if (tk === 'buddies') valSub = 'buddies';
        }

        const overlay = document.createElement('div');
        overlay.id = 'rareModal';
        const box = createNode('div', 'rareBox');
        overlay.appendChild(box);

        const curKey = () => activeTab === 'valorant' ? valSub : activeTab === 'mihoyo' ? mihoyoSub : activeTab === 'steam' ? steamSub : activeTab === 'supercell' ? 'brawl' : activeTab;
        const cat = () => CATEGORIES[curKey()];
        const draft = () => drafts[curKey()];
        const activeItemsView = () => box.querySelector('.rareItemsView[data-view="' + activeTab + '"]');

        const closeAllPops = () => box.querySelectorAll('.rarePop').forEach(p => p.remove());

        function buildPop(getColor, setColor, dot, defColor) {
            const wasOpen = box.querySelector('.rarePop');
            const same = wasOpen && wasOpen._dot === dot;
            closeAllPops();
            if (same) return;
            const pop = createNode('div', 'rarePop');
            pop._dot = dot;
            const current = (getColor() || '').toLowerCase();
            let matched = false;
            const grid = createNode('div', 'rarePopGrid');
            MENU_PALETTE.forEach(color => {
                const isActive = color.toLowerCase() === current;
                if (isActive) matched = true;
                const sw = createNode('div', 'rareSwatch' + (isActive ? ' active' : ''));
                sw.style.background = color;
                sw.title = color;
                sw.addEventListener('click', (e) => { e.stopPropagation(); setColor(color); closeAllPops(); });
                grid.appendChild(sw);
            });
            pop.appendChild(grid);
            pop.appendChild(createNode('div', 'rarePopDivider'));
            const custom = createNode('label', 'rareSwatchCustom' + (matched ? '' : ' active'));
            custom.title = 'Выбрать свой цвет';
            custom.innerHTML = `<span class="ccIco"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19 7-7a2.8 2.8 0 0 0-4-4l-7 7"/><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5Z"/><path d="m2 2 7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg></span><span class="ccTxt">Свой цвет</span>`;
            const input = document.createElement('input');
            input.type = 'color';
            input.value = /^#[0-9a-f]{6}$/i.test(getColor()) ? getColor() : (defColor || '#ffce14');
            input.addEventListener('click', (e) => e.stopPropagation());
            input.addEventListener('input', () => setColor(input.value));
            custom.appendChild(input);
            pop.appendChild(custom);
            box.appendChild(pop);
            const r = dot.getBoundingClientRect();
            const pw = pop.offsetWidth, ph = pop.offsetHeight;
            let left = r.left, top = r.bottom + 8;
            if (left + pw > window.innerWidth - 8) left = window.innerWidth - 8 - pw;
            if (left < 8) left = 8;
            if (top + ph > window.innerHeight - 8) top = r.top - 8 - ph;
            if (top < 8) top = 8;
            pop.style.left = left + 'px';
            pop.style.top = top + 'px';
        }

        function renderLevelFilter() {
            const view = activeItemsView();
            if (!view) return;
            const box = view.querySelector('.rareLevelFilter');
            if (!box) return;
            const key = curKey();
            const supported = !!LEVEL_FILTER_CATS[key];
            box.style.display = supported ? 'block' : 'none';
            if (!supported) return;
            const c = cat();
            const lf = loadLevelFilter(c);
            const enabled = box.querySelector('.rareLevelEnabled');
            const min = box.querySelector('.rareLevelMin');
            if (enabled && document.activeElement !== enabled) enabled.checked = lf.enabled;
            if (min && document.activeElement !== min) min.value = lf.min ? String(lf.min) : '';
            if (box.dataset.bound === '1') return;
            box.dataset.bound = '1';
            const persist = () => {
                const cc = cat();
                saveLevelFilter(cc, { enabled: enabled.checked, min: parseInt(min.value, 10) || 0 });
                rebuild();
            };
            enabled.addEventListener('change', persist);
            min.addEventListener('change', persist);
            min.addEventListener('input', () => { if (enabled.checked) persist(); });
        }

        function renderList() {
            const view = activeItemsView();
            if (!view) return;
            renderLevelFilter();
            const list = view.querySelector('.rareList');
            const items = draft().items;
            if (!items.length) { list.innerHTML = '<div class="rareEmpty">Список пуст. Добавьте название выше.</div>'; return; }
            list.innerHTML = '';
            items.forEach((item, i) => {
                const chip = createNode('div', 'rareChip');
                chip.style.setProperty('--chip-color', item.color);
                chip.dataset.idx = String(i);

                // Ручка перетаскивания (6 точек): приоритет порядка редких.
                // Сам DnD с живым предпросмотром обрабатывает enableDragReorder() на контейнере списка.
                const grip = Object.assign(createNode('span', 'rareChipGrip'), { title: 'Перетащите для приоритета (выше = первее)', innerHTML: gripSvg() });
                grip.setAttribute('draggable', 'true');

                const dot = Object.assign(createNode('span', 'dot'), { title: 'Выбрать цвет' });
                dot.style.background = item.color;
                dot.addEventListener('click', e => { e.stopPropagation(); buildPop(() => item.color, col => { item.color = col; dot.style.background = col; chip.style.setProperty('--chip-color', col); }, dot, cat().defaultColor); });

                const fxBox = Object.assign(createNode('input'), { type: 'checkbox', checked: item.effect === 'shimmer' });
                const fxMark = createNode('span', 'rareEffectMark' + (item.effect === 'shimmer' ? ' on' : ''));
                fxBox.addEventListener('change', () => { item.effect = fxBox.checked ? 'shimmer' : 'none'; fxMark.classList.toggle('on', fxBox.checked); });
                const fxLabel = createNode('label', 'rareEffectCheck');
                [fxBox, fxMark, createNode('span', '', 'доп. эффект')].forEach(el => fxLabel.appendChild(el));

                const checks = createNode('div', 'rareChipChecks');
                checks.appendChild(fxLabel);
                if (curKey() === 'brawl') {
                    // Мин. сила / кубки / ранг — фильтр по родным характеристикам бойца.
                    const mkNum = (val, title, label, key, max) => {
                        const inp = Object.assign(createNode('input'), { type:'number', min:'0', max: String(max||99999), value: String(Math.max(0, parseInt(val,10)||0)), title });
                        inp.addEventListener('change', () => { item[key] = Math.max(0, parseInt(inp.value,10)||0); });
                        const lab = createNode('label', 'rareEffectCheck rarePowerCheck');
                        [inp, createNode('span', '', label)].forEach(el => lab.appendChild(el));
                        return lab;
                    };
                    checks.appendChild(mkNum(item.minPower, 'Минимальная сила', 'мин. сила', 'minPower', 99));
                    checks.appendChild(mkNum(item.minTrophies, 'Минимум кубков', 'мин. кубки', 'minTrophies', 99999));
                    checks.appendChild(mkNum(item.minRank, 'Минимальный ранг', 'мин. ранг', 'minRank', 99));
                }

                const del = Object.assign(createNode('button', 'del'), { title: 'Удалить', innerHTML: delSvg() });
                del.addEventListener('click', () => { draft().items.splice(i, 1); renderList(); });

                const num = createNode('span', 'rareChipNum', String(i + 1));
                [grip, num, dot, createNode('span', 'name', item.name), checks, del].forEach(el => chip.appendChild(el));

                list.appendChild(chip);
            });
            // Переиспользуемый DnD-хелпер: живой предпросмотр перестановки (FLIP), тянуть за ручку.
            enableDragReorder(list, '.rareChip', '.rareChipGrip', (orderedIndexes) => {
                const arr = draft().items;
                draft().items = orderedIndexes.map(idx => arr[idx]);
                renderList();
            });
        }

        function addItem() {
            const view = activeItemsView();
            if (!view) return;
            const input = view.querySelector('.rareInput');
            const val = input.value.trim();
            if (!val) return;
            const items = draft().items;
            if (items.length >= MAX_ITEMS) return;
            if (items.some(x => x.name.toLowerCase() === val.toLowerCase())) { input.value = ''; return; }
            items.push({ name: val, color: cat().defaultColor, effect: 'none', minPower: curKey() === 'brawl' ? 11 : 0, minTrophies: 0, minRank: 0 });
            input.value = '';
            renderList();
            input.focus();
        }

        const SPECIAL_VIEWS = {
            activity: { sel: '.rareActView',    display: 'block', render: () => renderLevels() },
            stats:    { sel: '.rareStatsView',  display: 'flex',  render: () => renderStats() },
            custom:   { sel: '.rareCustomView', display: 'flex',  render: () => renderCustom() },
            funpay:   { sel: '.rareFunpayView', display: 'block', render: () => renderFunpay() },
        };
        function renderTab() {
            box.querySelectorAll('.rareTab').forEach(t => t.classList.toggle('active', t.dataset.tab === activeTab));
            closeAllPops();
            box.querySelectorAll('.rareItemsView, .rareActView, .rareCustomView, .rareStatsView')
               .forEach(el => { el.style.display = 'none'; });

            const special = SPECIAL_VIEWS[activeTab];
            if (special) {
                box.querySelector(special.sel).style.display = special.display;
                special.render();
                return;
            }
            const view = activeItemsView();
            if (!view) return;
            view.style.display = 'block';
            const subTabs = view.querySelector('.rareSubTabs');
            if (subTabs) {
                const buddiesTab = subTabs.querySelector('[data-sub="buddies"]');
                if (buddiesTab) buddiesTab.style.display = '';
                subTabs.style.display = 'flex';
                const activeSub = activeTab === 'mihoyo' ? mihoyoSub : activeTab === 'steam' ? steamSub : valSub;
                view.querySelectorAll('.rareSubTab').forEach(b => b.classList.toggle('active', b.dataset.sub === activeSub));
            }
            const c = cat();
            view.querySelector('.rareListTitle').textContent = c.listTitle;
            view.querySelector('.rareListDesc').textContent = c.listDesc;
            view.querySelector('.rareInput').placeholder = c.inputPlaceholder;
            const key = curKey();
            const hasDefaults = key === 'skins' || key === 'buddies' || key === 'fortnite';
            const defaultsBtn = view.querySelector('.rareListDefaults');
            if (defaultsBtn) defaultsBtn.style.display = hasDefaults ? '' : 'none';
            if (!view._listActionsBound) {
                view._listActionsBound = true;
                const clearBtn = view.querySelector('.rareListClear');
                if (clearBtn) clearBtn.addEventListener('click', async () => {
                    if (!draft().items.length) return;
                    const ok = await showRareConfirm({
                        title: 'Очистить список?',
                        body: 'Все предметы из текущего списка (' + draft().items.length + ') будут удалены.',
                        okText: 'Очистить',
                        cancelText: 'Отмена'
                    });
                    if (!ok) return;
                    draft().items = [];
                    renderList();
                });
                if (defaultsBtn) defaultsBtn.addEventListener('click', () => {
                    const c2 = cat();
                    const existing = draft().items;
                    const existingNames = new Set(existing.map(x => x.name.toLowerCase()));
                    const toAdd = c2.defaultWanted
                        .filter(x => !existingNames.has(String(x.name || '').toLowerCase()))
                        .map(x => ({
                            name: x.name,
                            color: x.color || c2.defaultColor,
                            effect: x.effect || 'none',
                            minPower: Math.max(0, parseInt(x.minPower, 10) || 0),
                            minTrophies: Math.max(0, parseInt(x.minTrophies, 10) || 0),
                            minRank: Math.max(0, parseInt(x.minRank, 10) || 0)
                        }));
                    draft().items = existing.concat(toAdd);
                    renderList();
                    showNoticeToast({
                        key: 'rare-defaults-added',
                        title: 'Готовая база',
                        body: 'Добавлены редкие из готовой базы, уже существующие были сохранены. Сверьте список и убедитесь что все нужные редкие предметы выбраны.'
                    });
                });
            }
            renderList();
        }

        const EFFECTS = [
            { v: 'none',  t: 'Без эффекта' },
            { v: 'glow',  t: 'Свечение' },
            { v: 'fire',  t: 'Огонь' },
        ];
        const sortLevels = levels => levels.slice().sort((a, b) => a.min - b.min);

        function renderLevels() {
            const wrapEl = box.querySelector('.actLevels');
            wrapEl.innerHTML = '';
            actDraft = sortLevels(actDraft);
            actDraft.forEach(lvl => {
                const mkNumInput = (minVal, val, title, onChange) => {
                    const inp = createNode('input'); inp.type = 'number'; inp.min = minVal; inp.value = val; inp.title = title;
                    inp.addEventListener('change', () => { const v = parseInt(inp.value, 10); if (!isNaN(v) && v >= +minVal) onChange(v); });
                    return inp;
                };
                const range = createNode('div', 'lvlRange');
                range.appendChild(mkNumInput('0', lvl.min, 'От (дней)', v => { lvl.min = v; renderLevels(); }));
                range.appendChild(document.createTextNode('–'));
                if (lvl.max === null) range.appendChild(Object.assign(createNode('span', 'lvlInf'), { textContent: '∞' }));
                else range.appendChild(mkNumInput('1', lvl.max, 'До (дней)', v => { lvl.max = v; renderLevels(); }));
                range.appendChild(document.createTextNode('дн.'));

                const dot = Object.assign(createNode('span', 'actDot'), { title: 'Цвет' });
                dot.style.background = lvl.color;
                dot.addEventListener('click', e => { e.stopPropagation(); buildPop(() => lvl.color, col => { lvl.color = col; dot.style.background = col; refreshPreviews(); }, dot, '#00ba78'); });

                const sel = createNode('select');
                EFFECTS.forEach(ef => sel.appendChild(Object.assign(createNode('option'), { value: ef.v, textContent: ef.t, selected: ef.v === lvl.effect })));
                sel.addEventListener('change', () => { lvl.effect = sel.value; refreshPreviews(); });

                const sampleDays = lvl.max === null ? lvl.min + 100 : Math.max(lvl.min, lvl.max - 1);
                const prevInner = createNode('span', 'lastActivityDays', sampleDays + ' ' + pluralDays(sampleDays));
                applyLevelStyle(prevInner, lvl.color, lvl.effect);
                const prev = createNode('div', 'actPrev');
                prev.appendChild(prevInner); prev._inner = prevInner; prev._lvl = lvl;

                const del = createNode('button', 'actDel'); del.title = 'Удалить уровень'; del.innerHTML = delSvg();
                del.addEventListener('click', () => { if (actDraft.length > 1) { actDraft.splice(actDraft.indexOf(lvl), 1); renderLevels(); } });

                const row = createNode('div', 'actLevel');
                [range, dot, sel, prev, del].forEach(el => row.appendChild(el));
                wrapEl.appendChild(row);
            });
        }
        function refreshPreviews() {
            box.querySelectorAll('.actPrev').forEach(p => {
                if (p._inner && p._lvl) applyLevelStyle(p._inner, p._lvl.color, p._lvl.effect);
            });
        }

        let _funpayBound = false;
        function renderFunpay() {
            // golden_key (общий)
            const gk = box.querySelector('.fpGoldenKey');
            if (gk && document.activeElement !== gk) gk.value = funpayDraft.goldenKey || '';

            // Подтабы категорий
            box.querySelectorAll('.rareFunpayView .rareSubTab').forEach(b => b.classList.toggle('active', b.dataset.sub === funpaySub));
            box.querySelectorAll('.rareFpCat').forEach(card => {
                const key = card.dataset.fpcat;
                card.style.display = key === funpaySub ? 'block' : 'none';
                if (key !== funpaySub) return;
                const c = funpayDraft.categories[key] || defaultFunpayCategoryCfg(key);
                const setVal = (sel, v) => { const el = card.querySelector(sel); if (el && document.activeElement !== el) el.value = v; };
                setVal('.fpSummaryRu', c.summaryRu); setVal('.fpSummaryEn', c.summaryEn);
                setVal('.fpDescRu', c.descRu); setVal('.fpDescEn', c.descEn);
            });
            renderFunpayHistory();

            if (_funpayBound) return;
            _funpayBound = true;
            if (gk) gk.addEventListener('input', () => { funpayDraft.goldenKey = gk.value.trim(); });
            box.querySelectorAll('.rareFunpayView .rareSubTab').forEach(btn => {
                btn.addEventListener('click', () => { funpaySub = btn.dataset.sub; renderFunpay(); });
            });
            box.querySelectorAll('.rareFpCat').forEach(card => {
                const c = funpayDraft.categories[card.dataset.fpcat];
                const fieldSels = ['.fpSummaryRu', '.fpSummaryEn', '.fpDescRu', '.fpDescEn'];
                const propBySel = { '.fpSummaryRu': 'summaryRu', '.fpSummaryEn': 'summaryEn', '.fpDescRu': 'descRu', '.fpDescEn': 'descEn' };
                const bind = (sel) => {
                    const el = card.querySelector(sel);
                    if (!el) return;
                    el._fpProp = propBySel[sel];
                    el.addEventListener('input', () => { c[el._fpProp] = el.value; });
                    el.addEventListener('focus', () => { card._fpLastField = el; });
                };
                fieldSels.forEach(bind);
                card._fpLastField = card.querySelector('.fpSummaryRu');
                // Клик по чипу-плейсхолдеру вставляет тег в последнее активное поле.
                card.querySelectorAll('.rareFpVar').forEach(chip => {
                    chip.addEventListener('click', () => {
                        const el = (card._fpLastField && card.contains(card._fpLastField)) ? card._fpLastField : card.querySelector('.fpSummaryRu');
                        if (!el) return;
                        const tag = chip.dataset.var;
                        const start = el.selectionStart != null ? el.selectionStart : el.value.length;
                        const end = el.selectionEnd != null ? el.selectionEnd : el.value.length;
                        el.value = el.value.slice(0, start) + tag + el.value.slice(end);
                        if (el._fpProp) c[el._fpProp] = el.value;
                        const pos = start + tag.length;
                        el.focus();
                        try { el.setSelectionRange(pos, pos); } catch (e) {}
                        chip.classList.add('is-copied');
                        setTimeout(() => chip.classList.remove('is-copied'), 350);
                    });
                });
            });
        }

        function renderFunpayHistory() {
            const host = box.querySelector('.rareFunpayHistory');
            if (!host) return;
            host._render = renderFunpayHistory;
            const items = loadFunpayHistory();
            if (!items.length) { host.innerHTML = '<div class="rareEmpty">История пуста.</div>'; return; }
            const statusLabel = { ok: 'Успех', warning: 'Warning', error: 'Ошибка' };
            host.innerHTML = items.slice(0, 60).map(it => {
                const cls = it.status === 'ok' ? 'is-ok' : it.status === 'warning' ? 'is-warn' : 'is-err';
                const linkBtn = (url, label, extraCls) => '<a class="rareFpLinkBtn ' + extraCls + '" href="' + escHtml(url)
                    + '" target="_blank" rel="noopener"><span class="rareFpLinkIco">' + externalLinkSvg() + '</span>' + label + '</a>';
                const links = [
                    it.funpayUrl ? linkBtn(it.funpayUrl, 'FunPay', 'is-fp') : '',
                    it.lztUrl ? linkBtn(it.lztUrl, 'LZT', 'is-lzt') : ''
                ].filter(Boolean).join('');
                const game = FUNPAY_ADAPTERS[it.gameKey] ? FUNPAY_ADAPTERS[it.gameKey].label : (it.gameKey || '');
                const checkNote = it.checkTitle ? '<span class="rareFpCheckNote">проверьте англ. название</span>' : '';
                return '<div class="rareFpRow ' + cls + '">'
                    + '<div class="rareFpRowHead"><span class="rareFpBadge">' + escHtml(statusLabel[it.status] || it.status || '') + '</span>'
                    + checkNote
                    + '<span class="rareFpDate">' + escHtml(formatTimeLabel(it.at)) + '</span>'
                    + '<span class="rareFpGame">' + escHtml(game) + '</span></div>'
                    + '<div class="rareFpTitle">' + escHtml(it.title || '—') + '</div>'
                    + (links ? '<div class="rareFpLinks">' + links + '</div>' : '')
                    + (it.message ? '<div class="rareFpMsg">' + escHtml(it.message) + '</div>' : '')
                    + '</div>';
            }).join('');
        }

        function renderCustom() {
            box.querySelector('.cstPanelColor').style.background = customDraft.panelColor || DEFAULT_CUSTOM.panelColor;
            box.querySelectorAll('.cstPaletteBtn').forEach(btn => btn.classList.toggle('active', btn.dataset.palette === customDraft.palette));
            [['--rare-accent', customDraft.accentColor], ['--rare-accent-rgb', hexToRgbList(customDraft.accentColor)],
             ['--rare-modal-bg', customDraft.modalBg], ['--rare-modal-bg-soft', customDraft.modalBgSoft],
             ['--rare-modal-bg-strong', customDraft.modalBgStrong], ['--rare-modal-sidebar', customDraft.modalSidebar],
             ['--rare-modal-card', customDraft.modalCard]].forEach(([k, v]) => box.style.setProperty(k, v));
            const syncCheck = (sel, val) => { const el = box.querySelector(sel); if (el) { el.checked = val; el.nextElementSibling.classList.toggle('on', val); } };
            const syncNum  = (sel, val) => { const el = box.querySelector(sel); if (el && document.activeElement !== el) el.value = String(val); };
            const tok = box.querySelector('.rareApiToken'); if (tok) tok.value = apiDraft.token || '';
            syncCheck('.rareApiPublishedAge', apiDraft.publishedAgeEnabled !== false);
            syncCheck('.rareApiCs2InventoryPrice', apiDraft.cs2InventoryPriceEnabled !== false);

        }

        const _statsLabels = { day: 'день', week: '7 дней', month: 'месяц' };
        function renderStatsCards(grid, stats) {
            grid.innerHTML = '';
            let idx = 0;
            ['day', 'week', 'month'].forEach(key => {
                const item = stats[key]; if (!item) return;
                const card = Object.assign(createNode('div', 'rareStatsCard rareStatsCard--enter'), { innerHTML:
                    '<div class="rareStatsCardLabel">Прибыль за ' + (_statsLabels[key] || key) + '</div>'
                    + '<div class="rareStatsCardValue">' + formatMoney(item.profit) + '</div>'
                    + '<div class="rareStatsCardMeta">Продажи: ' + formatMoney(item.soldTotal) + ' (' + item.salesCount + ')<br>Покупки: ' + formatMoney(item.paidTotal) + ' (' + item.buysCount + ')</div>'
                });
                card.style.animationDelay = (idx * 0.08) + 's';
                idx++;
                grid.appendChild(card);
            });
        }
        const renderStatsUpdated = savedAt => { const el = box.querySelector('.rareStatsUpdated'); if (el) el.textContent = savedAt ? 'Обновлено: ' + formatTimeLabel(savedAt) : ''; };

        let statsReqId = 0;
        async function renderStats(forceRefresh) {
            const view = box.querySelector('.rareStatsView');
            if (!view) return;
            const grid = view.querySelector('.rareStatsGrid');
            if (!grid) return;
            if (!hasApiToken()) {
                renderStatsUpdated(0);
                grid.innerHTML = '<div class="rareStatsCard"><div class="rareStatsCardLabel">Статистика</div><div class="rareStatsCardMeta">Добавьте API token с правами payment.</div></div>';
                return;
            }
            const cache = loadStatsCache();
            if (!forceRefresh && cache && (Date.now() - cache.savedAt) < STATS_CACHE_TTL) {
                renderStatsUpdated(cache.savedAt);
                renderStatsCards(grid, cache.stats);
                return;
            }
            const reqId = ++statsReqId;
            renderStatsUpdated(cache ? cache.savedAt : 0);
            // Три skeleton-карточки с shimmer — по числу блоков статистики (день/7 дней/месяц).
            grid.innerHTML = ['день', '7 дней', 'месяц'].map(lbl =>
                '<div class="rareStatsCard rareStatsCard--skeleton">'
                + '<div class="rareStatsCardLabel">Прибыль за ' + lbl + '</div>'
                + '<div class="rareStatsSkelLine rareStatsSkelValue"></div>'
                + '<div class="rareStatsSkelLine rareStatsSkelMeta"></div>'
                + '<div class="rareStatsSkelLine rareStatsSkelMeta is-short"></div>'
                + '</div>'
            ).join('');
            try {
                const stats = await fetchProfitStats();
                if (reqId !== statsReqId) return;
                saveStatsCache(stats);
                const freshCache = loadStatsCache();
                renderStatsUpdated(freshCache ? freshCache.savedAt : Date.now());
                renderStatsCards(grid, stats);
            } catch (e) {
                if (reqId !== statsReqId) return;
                grid.innerHTML = '<div class="rareStatsCard"><div class="rareStatsCardLabel">Статистика</div><div class="rareStatsCardMeta">' + escHtml(formatErrorText(e, 'Не удалось загрузить статистику')) + '</div></div>';
            }
        }

        function bindCustomOnce() {
            const panelDot = box.querySelector('.cstPanelColor');
            if (!panelDot || panelDot._bound) return;
            panelDot._bound = true;
            panelDot.addEventListener('click', (e) => {
                e.stopPropagation();
                buildPop(() => customDraft.panelColor, (col) => {
                    customDraft.panelColor = col;
                    renderCustom();
                }, panelDot, DEFAULT_CUSTOM.panelColor);
            });
            box.querySelectorAll('.cstPaletteBtn').forEach(btn => btn.addEventListener('click', () => {
                applyPaletteToCustom(customDraft, btn.dataset.palette || DEFAULT_CUSTOM.palette);
                renderCustom();
            }));
            const hintsResetBtn = box.querySelector('.cstHintsReset');
            if (hintsResetBtn) {
                hintsResetBtn.addEventListener('click', () => {
                    resetDismissedHints();
                    showThemeToast('Подсказки сброшены');
                });
            }
            const bindCheck = (selector, onChange) => {
                const input = box.querySelector(selector);
                if (!input) return;
                input.addEventListener('change', () => {
                    const mark = input.nextElementSibling;
                    if (mark) mark.classList.toggle('on', !!input.checked);
                    onChange(!!input.checked);
                });
            };
            const tokenInput = box.querySelector('.rareApiToken');
            if (tokenInput) tokenInput.addEventListener('input', () => { apiDraft.token = tokenInput.value.trim(); });
            bindCheck('.rareApiPublishedAge', value => { apiDraft.publishedAgeEnabled = value; });
            bindCheck('.rareApiCs2InventoryPrice', value => { apiDraft.cs2InventoryPriceEnabled = value; });
        }

        box.innerHTML = `
            <div class="rareHead">
                <div class="rareHeadIcon">${marketSvg()}</div>
                <div class="rareHeadText"><h3>MARKET ENHANCER</h3></div>
                <button class="rareClose" title="Закрыть">${closeSvg()}</button>
            </div>
            <div class="rareTabs">
                ${_settingsTabsHtml}
            </div>
            <div class="rareBody">
                ${_settingsItemViewsHtml}
                ${_funpayViewHtml}
                <div class="rareActView" style="display:none">
                    <div class="rareCard">
                        <p class="actIntro">Уровни проверяются по возрастанию порога. Дата подсвечивается настройками первого уровня, в диапазон которого попадает количество дней.</p>
                        <div class="actLevels"></div>
                        <button class="actAdd">+ Добавить уровень</button>
                    </div>
                </div>
                <div class="rareStatsView" style="display:none">
                    <div class="rareCard">
                        <div class="rareStatsHead">
                            <div>
                                <h4>Статистика</h4>
                                <p class="rareSubTxt">Profit считается как продажи аккаунтов минус покупки аккаунтов по истории транзакций за 1, 7 и 30 дней.</p>
                                <p class="rareSubTxt">Обновляется раз в 30 минут, ручное обновление по кнопке в правом верхнем углу.</p>
                            </div>
                            <div class="rareStatsActions">
                                <span class="rareStatsUpdated"></span>
                                <button type="button" class="rareBtn rareBtnGhost rareStatsRefresh" title="Обновить статистику" aria-label="Обновить статистику"><span class="rareStatsRefreshIcon">${refreshSvg()}</span></button>
                            </div>
                        </div>
                        <div class="rareStatsGrid"></div>
                    </div>
                </div>
                <div class="rareCustomView" style="display:none">
                    <div class="rareCard cstCardTight rareApiCard">
                        <h4>API и автоматизация</h4>
                        <p class="rareSubTxt">Токен с правами market, а для профита еще и payment.</p>
                        <p class="rareSubTxt">Функции применяются раз в 15 минут.</p>
                        <div class="rareInputRow"><input type="password" class="rareApiToken" placeholder="Bearer token" autocomplete="off"></div>
                        <div class="cstRow"><label class="rareEffectCheck"><input type="checkbox" class="rareApiPublishedAge"><span class="rareEffectMark"></span><span>Показывать дни с публикации</span></label></div>
                        <div class="rareInputNote">Если выключено, скрипт не запрашивает API для дат публикации и не показывает бейджи дней.</div>
                        <div class="cstRow"><label class="rareEffectCheck"><input type="checkbox" class="rareApiCs2InventoryPrice"><span class="rareEffectMark"></span><span>Парсить цены CS2-инвентаря</span></label></div>
                        <div class="rareInputNote">Если выключено, скрипт не запрашивает market.csgo.com и не показывает расчет стоимости CS2-инвентаря.</div>

                    </div>
                    <div class="rareCard">
                        <h4>Оформление</h4>
                        <p class="rareSubTxt">Приглушенные палитры для меню и интерфейсных акцентов скрипта.</p>
                        <div class="cstPaletteGrid">
                            <button type="button" class="cstPaletteBtn" data-palette="emerald" style="--p-bg1:#1a261f;--p-bg2:#223229"><span class="cstPaletteHero"></span><span class="cstPaletteSwatches"><span style="background:#2f8f6a"></span><span style="background:#48b889"></span><span style="background:#9e8550"></span></span><span class="cstPaletteMeta"><span class="cstPaletteBtnLabel">Emerald</span><span class="cstPaletteCheck">${checkSvg()}</span></span></button>
                            <button type="button" class="cstPaletteBtn" data-palette="amber" style="--p-bg1:#261d14;--p-bg2:#35281c"><span class="cstPaletteHero"></span><span class="cstPaletteSwatches"><span style="background:#8c6a34"></span><span style="background:#d2a55d"></span><span style="background:#b48b48"></span></span><span class="cstPaletteMeta"><span class="cstPaletteBtnLabel">Amber</span><span class="cstPaletteCheck">${checkSvg()}</span></span></button>
                            <button type="button" class="cstPaletteBtn" data-palette="rose" style="--p-bg1:#25191f;--p-bg2:#342229"><span class="cstPaletteHero"></span><span class="cstPaletteSwatches"><span style="background:#8a4f63"></span><span style="background:#cb8198"></span><span style="background:#a97b64"></span></span><span class="cstPaletteMeta"><span class="cstPaletteBtnLabel">Rose</span><span class="cstPaletteCheck">${checkSvg()}</span></span></button>
                            <button type="button" class="cstPaletteBtn" data-palette="violet" style="--p-bg1:#1f1c29;--p-bg2:#2a2436"><span class="cstPaletteHero"></span><span class="cstPaletteSwatches"><span style="background:#5f567f"></span><span style="background:#9e93ca"></span><span style="background:#8f7a99"></span></span><span class="cstPaletteMeta"><span class="cstPaletteBtnLabel">Violet</span><span class="cstPaletteCheck">${checkSvg()}</span></span></button>
                            <button type="button" class="cstPaletteBtn" data-palette="slate" style="--p-bg1:#192026;--p-bg2:#24303a"><span class="cstPaletteHero"></span><span class="cstPaletteSwatches"><span style="background:#47606f"></span><span style="background:#86a5b6"></span><span style="background:#7f8e98"></span></span><span class="cstPaletteMeta"><span class="cstPaletteBtnLabel">Slate</span><span class="cstPaletteCheck">${checkSvg()}</span></span></button>
                            <button type="button" class="cstPaletteBtn" data-palette="copper" style="--p-bg1:#261913;--p-bg2:#34221b"><span class="cstPaletteHero"></span><span class="cstPaletteSwatches"><span style="background:#8a5b43"></span><span style="background:#cb8a69"></span><span style="background:#b78659"></span></span><span class="cstPaletteMeta"><span class="cstPaletteBtnLabel">Copper</span><span class="cstPaletteCheck">${checkSvg()}</span></span></button>
                            <button type="button" class="cstPaletteBtn" data-palette="olive" style="--p-bg1:#1d2113;--p-bg2:#293019"><span class="cstPaletteHero"></span><span class="cstPaletteSwatches"><span style="background:#66723d"></span><span style="background:#a6bb6b"></span><span style="background:#95854f"></span></span><span class="cstPaletteMeta"><span class="cstPaletteBtnLabel">Olive</span><span class="cstPaletteCheck">${checkSvg()}</span></span></button>
                            <button type="button" class="cstPaletteBtn" data-palette="wine" style="--p-bg1:#24151b;--p-bg2:#341f28"><span class="cstPaletteHero"></span><span class="cstPaletteSwatches"><span style="background:#7b4251"></span><span style="background:#c2758f"></span><span style="background:#9d6b5f"></span></span><span class="cstPaletteMeta"><span class="cstPaletteBtnLabel">Wine</span><span class="cstPaletteCheck">${checkSvg()}</span></span></button>
                            <button type="button" class="cstPaletteBtn" data-palette="ocean" style="--p-bg1:#152228;--p-bg2:#1b3138"><span class="cstPaletteHero"></span><span class="cstPaletteSwatches"><span style="background:#356d77"></span><span style="background:#6db5c2"></span><span style="background:#6d8f95"></span></span><span class="cstPaletteMeta"><span class="cstPaletteBtnLabel">Ocean</span><span class="cstPaletteCheck">${checkSvg()}</span></span></button>
                            <button type="button" class="cstPaletteBtn" data-palette="ash" style="--p-bg1:#1a1b1c;--p-bg2:#27292b"><span class="cstPaletteHero"></span><span class="cstPaletteSwatches"><span style="background:#5f666c"></span><span style="background:#a3adb7"></span><span style="background:#8b8176"></span></span><span class="cstPaletteMeta"><span class="cstPaletteBtnLabel">Ash</span><span class="cstPaletteCheck">${checkSvg()}</span></span></button>
                        </div>
                    </div>
                    <div class="rareCard cstCardTight">
                        <h4>Блок редких предметов</h4>
                        <p class="rareSubTxt">Отдельные настройки панели с редкими предметами на странице.</p>
                        <div class="cstRow">
                            <span class="cstLabel">Цвет блока с редкими предметами</span>
                            <span class="cstDot cstPanelColor" title="Выбрать цвет"></span>
                        </div>
                    </div>
                    <button class="cstHintsReset">Восстановить все подсказки</button>
                </div>
            </div>
            <div class="rareFoot">
                <button class="rareBtn rareBtnGhost rareBtnImport">Импорт JSON</button>
                <button class="rareBtn rareBtnGhost rareBtnExport">Экспорт JSON</button>
                <button class="rareBtn rareBtnCancel">Отмена</button>
                <button class="rareBtn rareBtnSave">Сохранить</button>
            </div>
        `;

        box.querySelectorAll('.rareTab').forEach(tab => {
            tab.addEventListener('click', () => {
                activeTab = tab.dataset.tab;
                renderTab();
                const view = activeItemsView();
                const input = view && view.querySelector('.rareInput');
                if (input) input.focus();
            });
        });
        bindCustomOnce();
        box.querySelectorAll('.rareSubTab').forEach(btn => {
            if (btn.closest('.rareFunpayView')) return; // FunPay-подтабы обрабатывает renderFunpay
            btn.addEventListener('click', () => {
                if (activeTab === 'mihoyo') mihoyoSub = btn.dataset.sub;
                else if (activeTab === 'steam') steamSub = btn.dataset.sub;
                else valSub = btn.dataset.sub;
                renderTab();
                const view = activeItemsView();
                const input = view && view.querySelector('.rareInput');
                if (input) input.focus();
            });
        });
        box.querySelector('.rareStatsRefresh').addEventListener('click', () => { renderStats(true); });
        box.querySelector('.actAdd').addEventListener('click', () => {
            const sorted = sortLevels(actDraft);
            const last = sorted[sorted.length - 1];
            const base = last ? (last.max === null ? last.min + 30 : last.max) : 30;
            actDraft.push({ min: base, max: base + 30, color: '#00ba78', effect: 'none' });
            renderLevels();
        });
        box.addEventListener('click', (e) => { if (!e.target.closest('.rarePop') && !e.target.closest('.dot') && !e.target.closest('.actDot')) closeAllPops(); });
        box.querySelectorAll('.rareAddBtn').forEach(btn => btn.addEventListener('click', addItem));
        box.querySelectorAll('.rareInput').forEach(input => {
            input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } });
        });

        const onOverlayKeyDown = (e) => {
            if (e.key !== 'Escape') return;
            e.preventDefault();
            close();
        };
        function close() {
            document.removeEventListener('keydown', onOverlayKeyDown, true);
            overlay.remove();
        }
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        box.querySelector('.rareClose').addEventListener('click', close);
        box.querySelector('.rareBtnCancel').addEventListener('click', close);
        box.querySelector('.rareBtnExport').addEventListener('click', () => {
            const wanted = {};
            CONFIG_CATEGORY_KEYS.forEach(key => {
                wanted[key] = drafts[key].items.map(x => ({ name: x.name, color: x.color, effect: x.effect || 'none', minPower: Math.max(0, parseInt(x.minPower, 10) || 0), minTrophies: Math.max(0, parseInt(x.minTrophies, 10) || 0), minRank: Math.max(0, parseInt(x.minRank, 10) || 0) }));
            });
            const payload = {
                version: 1,
                exportedAt: new Date().toISOString(),
                wanted,
                activityLevels: actDraft.map(l => ({ min: l.min, max: l.max, color: l.color, effect: sanitizeActivityEffect(l.effect) })),
                custom: Object.assign({}, customDraft),
                api: {
                    publishedAgeEnabled: apiDraft.publishedAgeEnabled !== false,
                    cs2InventoryPriceEnabled: apiDraft.cs2InventoryPriceEnabled !== false
                }
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'market-enhancer-config.json';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
        });
        box.querySelector('.rareBtnImport').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json';
            input.addEventListener('change', () => {
                const file = input.files && input.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const parsed = parseJsonOrThrow(String(reader.result || '{}'), 'Не удалось импортировать JSON-конфиг');
                        applySettingsConfig(parsed);
                        close();
                        updateLastActivityDays(true);
                        rebuild();
                        applyCustom();
                    } catch (e) {
                        showUiError(e, 'Не удалось импортировать JSON-конфиг', 'settings-import');
                    }
                };
                reader.onerror = () => { showUiError(createError('Не удалось прочитать файл конфигурации', '', { fileName: file.name || '' }), 'Не удалось прочитать файл конфигурации', 'settings-import-read'); };
                reader.readAsText(file, 'utf-8');
            });
            input.click();
        });
        box.querySelector('.rareBtnSave').addEventListener('click', () => {
            const prevApiSettings = API_SETTINGS;
            CONFIG_CATEGORY_KEYS.forEach(k => {
                const c = CATEGORIES[k];
                c.wanted = drafts[k].items.map(x => ({ name: x.name, color: x.color, effect: x.effect || 'none', minPower: Math.max(0, parseInt(x.minPower, 10) || 0), minTrophies: Math.max(0, parseInt(x.minTrophies, 10) || 0), minRank: Math.max(0, parseInt(x.minRank, 10) || 0) }));
                saveWanted(c, c.wanted);
            });
            ACT_LEVELS = sortLevels(actDraft).map(l => ({ min: l.min, max: l.max, color: l.color, effect: sanitizeActivityEffect(l.effect) }));
            saveLevels(ACT_LEVELS);
            CUSTOM = Object.assign({}, customDraft);
            saveCustom(CUSTOM);
            API_SETTINGS = normalizeApiSettings(apiDraft);
            saveApiSettings(API_SETTINGS);
            FUNPAY = normalizeFunpayUploader(funpayDraft);
            saveFunpayUploader(FUNPAY);
            if (hasApiToken()) hidePersistentApiTokenToast();
            const publishedAgeChanged = !prevApiSettings || prevApiSettings.publishedAgeEnabled !== API_SETTINGS.publishedAgeEnabled;
            const cs2InventoryPriceChanged = !prevApiSettings || prevApiSettings.cs2InventoryPriceEnabled !== API_SETTINGS.cs2InventoryPriceEnabled;
            close();
            showThemeToast('Настройки сохранены');
            updateLastActivityDays(true);
            rebuild();
            applyCustom();
            if (publishedAgeChanged) {
                if (publishedAgeEnabled()) { ensurePublishedAgeWatcher(); queuePublishedAgeUpdate(); }
                else stopPublishedAgeWatcher();
            }
            if (cs2InventoryPriceChanged && !cs2InventoryPriceEnabled()) clearSteamInventoryMarketPrice();
        });

        document.addEventListener('keydown', onOverlayKeyDown, true);
        document.body.appendChild(overlay);
        renderCustom();
        renderTab();
        const view = activeItemsView();
        const input = view && view.querySelector('.rareInput');
        if (input) input.focus();
    }
    const pluralDays    = n => pluralizeRu(n, ['день',    'дня',    'дней']);
    const pluralHours   = n => pluralizeRu(n, ['час',     'часа',   'часов']);
    const pluralMinutes = n => pluralizeRu(n, ['минуту',  'минуты', 'минут']);
    function priceAgeLabel(savedAt){
        if(!savedAt) return '';
        const diff = Date.now() - savedAt;
        if(diff < 60*1000) return 'обновлено только что';
        const mins = Math.floor(diff/(60*1000));
        if(mins < 60) return 'обновлено ' + mins + ' ' + pluralMinutes(mins) + ' назад';
        const hours = Math.floor(diff/(60*60*1000));
        return 'обновлено ' + hours + ' ' + pluralHours(hours) + ' назад';
    }

    function findLastActivityCounter(root) {
        const counters = root.querySelectorAll('.counter');
        for (const counter of counters) {
            const muted = counter.querySelector('.muted');
            const label = norm(muted ? muted.textContent : '');
            const counterText = norm(counter.textContent || '');
            if (label === norm('Последняя активность') || label === norm('Последний рейд') || label === norm('Последняя игровая активность') || label.indexOf(norm('Последний вход в игру')) !== -1) return counter;
            if (counterText.includes(norm('Последняя игровая активность'))) return counter;
            if (counterText.includes(norm('Последний вход в игру'))) return counter;
        }
        return null;
    }

    function getCounterLabelText(counter) {
        const label = counter && counter.querySelector('.label');
        const firstText = label && label.childNodes.length ? Array.from(label.childNodes).find(n => n.nodeType === 3) : null;
        return String(firstText ? firstText.textContent : (label ? label.textContent : '')).trim();
    }

    function isWeekdayOnlyActivity(counter) {
        const text = norm(getCounterLabelText(counter));
        return text === norm('Понедельник') || text === norm('Вторник') || text === norm('Среда') || text === norm('Четверг') || text === norm('Пятница') || text === norm('Суббота') || text === norm('Воскресенье');
    }

    function getActivityRoots() {
        const roots = Array.from(document.querySelectorAll('.marketFortniteCommonInfo, .marketItemView--commonInfo, .marketItemView--counters, .marketItemView--mainInfoContainer, .item-content'));
        if (!roots.includes(document.body)) roots.push(document.body);
        return roots;
    }

    function parseActivityDays(counter) {
        const abbr = counter && counter.querySelector('abbr.DateTime[data-time], abbr[data-time]');
        const timeEl = counter && counter.querySelector('time[data-timestamp], time[datetime]');
        let rawTs = NaN;
        if (abbr) {
            rawTs = parseInt(abbr.getAttribute('data-time'), 10);
        } else if (timeEl) {
            const tsAttr = timeEl.getAttribute('data-timestamp');
            if (tsAttr) rawTs = parseInt(tsAttr, 10);
            else {
                const dt = timeEl.getAttribute('datetime');
                if (dt) { const ms = Date.parse(dt); if (Number.isFinite(ms)) rawTs = Math.floor(ms / 1000); }
            }
        }
        if ((!Number.isFinite(rawTs) || rawTs <= 0) && counter) {
            const text = getCounterLabelText(counter);
            const m = text.match(/^(\d{1,2})\s+([а-яё]+)\s+(\d{4})$/i);
            if (m) {
                const months = { янв:0, января:0, фев:1, февраля:1, мар:2, марта:2, апр:3, апреля:3, май:4, мая:4, июн:5, июня:5, июл:6, июля:6, авг:7, августа:7, сен:8, сентября:8, окт:9, октября:9, ноя:10, ноября:10, дек:11, декабря:11 };
                const monthIndex = months[norm(m[2])];
                if (monthIndex !== undefined) rawTs = Math.floor(new Date(parseInt(m[3], 10), monthIndex, parseInt(m[1], 10)).getTime() / 1000);
            }
        }
        if (!Number.isFinite(rawTs) || rawTs <= 0) return null;

        const days = Math.floor((Date.now() - rawTs * 1000) / 86400000);
        return days >= 0 ? days : 0;
    }

    function getCurrentDaybreak() {
        const roots = getActivityRoots();
        for (const root of roots) {
            const counter = findLastActivityCounter(root);
            const days = parseActivityDays(counter);
            if (days !== null) return days;
        }
        return null;
    }

    function cleanAutoTitleSkinName(name) {
        return String(name || '').replace(/[«»"“”„‟]/g, '').replace(/\s+/g, ' ').trim();
    }

    // Достаёт итоговое число из подписи-заголовка списка LZT вида
    // «154 скина · 29 платных ≈ 36 300 V-Bucks (можно менять местами)».
    // Берётся ПЕРВОЕ число (всего предметов), а не число платных/V-Bucks.
    // Заголовок ищем по картинко-ссылке в <h4> (type=<imgType>) либо как ближайший
    // предшествующий заголовок перед списком. Пробелы-разделители тысяч убираются.
    function parseLeadingCount(text) {
        const s = String(text || '').replace(/\u00a0/g, ' ');
        // Первое число до знака «·»/«платн»/«V-Bucks» — с учётом пробелов-разрядов.
        const m = s.match(/(\d[\d\s]*)/);
        if (!m) return null;
        const n = parseInt(m[1].replace(/\s+/g, ''), 10);
        return Number.isFinite(n) ? n : null;
    }
    function findListHeaderEl(ul, imgType) {
        if (!ul) return null;
        // 1) По ссылке скачивания картинки внутри заголовка: a[href*="type=<imgType>"].
        if (imgType) {
            const link = document.querySelector('a.outfitsImageDownloadSvg[href*="type=' + imgType + '"], a[href*="image?type=' + imgType + '"]');
            if (link) {
                const h = link.closest('h4') || link.parentElement;
                if (h) return h;
            }
        }
        // 2) Ближайший предшествующий <h4>/заголовок перед списком (или его обёрткой).
        let node = ul;
        for (let hops = 0; node && hops < 4; hops++) {
            let sib = node.previousElementSibling;
            while (sib) {
                if (/^h[1-6]$/i.test(sib.tagName)) return sib;
                const inner = sib.querySelector && sib.querySelector('h1,h2,h3,h4,h5,h6');
                if (inner) return inner;
                sib = sib.previousElementSibling;
            }
            node = node.parentElement;
        }
        return null;
    }
    // Количество предметов списка: сначала из подписи-заголовка (переживает ленивую
    // подгрузку карточек), при отсутствии подписи — фолбэк на подсчёт <li.item>.
    function getListItemCount(ul, imgType) {
        if (!ul) return 0;
        const header = findListHeaderEl(ul, imgType);
        if (header) {
            const fromLabel = parseLeadingCount(header.textContent);
            if (fromLabel != null && fromLabel >= 0) return fromLabel;
        }
        return ul.querySelectorAll('li.item').length;
    }

    function getAutoTitleSkinCount() {
        const skinsUl = document.querySelector('ul[data-key="' + CATEGORIES.skins.key + '"]');
        return getListItemCount(skinsUl, 'skins');
    }

    // Упорядочивает найденные имена по приоритету из wanted-списка категории
    // (порядок задаётся drag-ручкой «6 точек»: чем выше в списке — тем первее).
    // Имена, которых нет в wanted, идут в конце в исходном порядке.
    function orderNamesByWanted(names, cat) {
        const wanted = (cat && Array.isArray(cat.wanted)) ? cat.wanted : [];
        const priority = new Map();
        // Та же нормализация, что и в matchWanted, иначе кавычки/дефисы ломают сопоставление.
        wanted.forEach((w, i) => { const k = normalizeWantedText(w && w.name); if (k && !priority.has(k)) priority.set(k, i); });
        const rank = n => { const p = priority.get(normalizeWantedText(n)); return p == null ? Number.MAX_SAFE_INTEGER : p; };
        // Стабильная сортировка по приоритету wanted.
        return names.map((n, i) => ({ n, i })).sort((a, b) => (rank(a.n) - rank(b.n)) || (a.i - b.i)).map(x => x.n);
    }

    // Переиспользуемая сортировка массива ЛЮБЫХ объектов-совпадений по приоритету
    // wanted-списка (тот порядок, что пользователь задал перетаскиванием в настройках).
    // getName(item) должен вернуть имя предмета для сопоставления с cat.wanted.
    // Стабильна: элементы с одинаковым рангом сохраняют исходный (DOM) порядок,
    // ненайденные в wanted — уходят в конец. Используется всеми панелями редких.
    function orderMatchesByWanted(matches, cat, getName) {
        const wanted = (cat && Array.isArray(cat.wanted)) ? cat.wanted : [];
        const priority = new Map();
        // ВАЖНО: та же нормализация, что и в matchWanted (normalizeWantedText),
        // иначе ключи не совпадут (кавычки/дефисы) и приоритет не сработает.
        wanted.forEach((w, i) => { const k = normalizeWantedText(w && w.name); if (k && !priority.has(k)) priority.set(k, i); });
        const rank = (item) => {
            const p = priority.get(normalizeWantedText(getName(item) || ''));
            return p == null ? Number.MAX_SAFE_INTEGER : p;
        };
        return (matches || []).map((m, i) => ({ m, i }))
            .sort((a, b) => (rank(a.m) - rank(b.m)) || (a.i - b.i))
            .map(x => x.m);
    }

    function getAutoTitleRareSkinNames() {
        const skinsUl = document.querySelector('ul[data-key="' + CATEGORIES.skins.key + '"]');
        if (!skinsUl) return [];
        return orderNamesByWanted(dedupCleanNames(collectMatchesFromList(skinsUl, CATEGORIES.skins).map(match => getItemName(match.li))), CATEGORIES.skins);
    }

    const dedupCleanNames = names => {
        const seen = new Set();
        const out = [];
        names.forEach(name => {
            const clean = cleanAutoTitleSkinName(name);
            const key = norm(clean);
            if (!key || seen.has(key)) return;
            seen.add(key);
            out.push(clean);
        });
        return out;
    };

    function getAutoTitleSourceInfo() {
        const game = detectGame();
        if (game === 'fortnite') {
            const skinsUl = document.querySelector('ul[data-key="fortnite_skins"]');
            // Количество берём из подписи-заголовка («154 скина · …»), а не из числа
            // отрисованных карточек — иначе ленивая подгрузка занижает count.
            const count = getListItemCount(skinsUl, 'skins');
            const matchedNames = skinsUl ? Array.from(skinsUl.querySelectorAll('li.item'))
                .map(li => getItemName(li).trim())
                .filter(name => matchWanted(name, CATEGORIES.fortnite)) : [];
            return { count, names: orderNamesByWanted(dedupCleanNames(matchedNames), CATEGORIES.fortnite), unit: 'skins' };
        }
        if (game === 'steam') {
            const lists = findSteamLists();
            const gameCount = lists.reduce((sum, ul) => sum + ul.querySelectorAll('li.item').length, 0);
            const medalCount = findSteamMedalItems().length;
            const matches = collectSteamGameMatches(CATEGORIES.steam, lists).concat(collectSteamMedalMatches(CATEGORIES.steammedals));
            return { count: gameCount + medalCount, names: orderNamesByWanted(dedupCleanNames(matches.map(m => m.name)), CATEGORIES.steam), unit: 'games' };
        }
        return { count: getAutoTitleSkinCount(), names: getAutoTitleRareSkinNames(), unit: 'skins' };
    }

    function buildAutoMarketTitleWithLimit(source) {
        const countPart = source.count > 0 ? (source.count + ' ' + source.unit) : '';
        const names = Array.isArray(source.names) ? source.names.slice() : [];
        while (names.length >= 0) {
            const title = [countPart, names.length ? names.join(', ') : ''].filter(Boolean).join(' / ').trim();
            if (title.length <= 120 || !names.length) return title;
            names.pop();
        }
        return countPart;
    }

    function buildAutoMarketTitle() {
        const source = getAutoTitleSourceInfo();
        return buildAutoMarketTitleWithLimit(source);
    }

    async function saveEditableTitleValue(editable, title) {
        const nextTitle = String(title || '').trim();
        if (!editable || !nextTitle) return false;
        const prevTitle = editable.textContent || '';
        editable.textContent = nextTitle;
        editable.setAttribute('title', nextTitle);

        const tokenInput = document.querySelector('input[name="_xfToken"]');
        const xfToken = tokenInput ? tokenInput.value : '';
        const saveUrlRaw = editable.getAttribute('data-save-url') || '';
        const saveUrl = saveUrlRaw ? new URL(saveUrlRaw, location.origin).toString() : '';

        const aiButtonHost = document.querySelector('.AiTitleButton[data-item-id]');
        const itemId = aiButtonHost ? aiButtonHost.getAttribute('data-item-id') : ((location.pathname.match(/\/(\d+)(?:[/?#]|$)/) || [])[1] || '');
        const fallbackUrl = itemId ? new URL('/market/' + itemId + '/edit', location.origin).toString() : '';
        const requestUrls = [saveUrl, fallbackUrl].filter(Boolean);
        if (!requestUrls.length) return false;

        try {
            const attempts = [];
            requestUrls.forEach(url => {
                const jsonPayload = { key: 'title', value: nextTitle };
                if (xfToken) jsonPayload._xfToken = xfToken;
                attempts.push({
                    url,
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json, text/javascript, */*; q=0.01'
                    },
                    body: JSON.stringify(jsonPayload)
                });

                const formPayload = new URLSearchParams();
                formPayload.set('key', 'title');
                formPayload.set('value', nextTitle);
                if (xfToken) formPayload.set('_xfToken', xfToken);
                attempts.push({
                    url,
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json, text/javascript, */*; q=0.01'
                    },
                    body: formPayload.toString()
                });

                attempts.push({
                    url,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json, text/javascript, */*; q=0.01'
                    },
                    body: formPayload.toString()
                });
            });

            let ok = false;
            for (const attempt of attempts) {
                const response = await fetch(attempt.url, {
                    method: attempt.method,
                    credentials: 'same-origin',
                    headers: attempt.headers,
                    body: attempt.body
                });
                if (!response.ok) continue;
                const data = await response.json().catch(() => null);
                ok = !!(data && (data.status === 'ok' || (!data.error && !data.errors)));
                if (ok) break;
            }

            if (!ok) {
                editable.textContent = prevTitle;
                editable.setAttribute('title', prevTitle);
            }
            return ok;
        } catch (e) {
            editable.textContent = prevTitle;
            editable.setAttribute('title', prevTitle);
            return false;
        }
    }

    const hasApiToken = () => !!(API_SETTINGS && String(API_SETTINGS.token || '').trim());

    function getUserscriptRequest() {
        if (typeof GM_xmlhttpRequest === 'function') return GM_xmlhttpRequest;
        if (typeof GM === 'object' && GM && typeof GM.xmlHttpRequest === 'function') {
            return (details) => GM.xmlHttpRequest(details);
        }
        if (typeof window !== 'undefined' && window.__MARKET_ENHANCER_DEV__) {
            const bridge = window.__MARKET_ENHANCER_DEV__;
            if (typeof bridge.GM_xmlhttpRequest === 'function') return bridge.GM_xmlhttpRequest;
            if (bridge.GM && typeof bridge.GM.xmlHttpRequest === 'function') {
                return (details) => bridge.GM.xmlHttpRequest(details);
            }
        }
        return null;
    }

    function notifyInvalidApiToken(errorText) {
        if (!/invalid or expired access token/i.test(errorText || '')) return;
        showPersistentApiTokenToast('API-функции скрипта', true);
    }

    async function apiFetch(path, opts) {
        const o = opts || {};
        if (!hasApiToken()) {
            showPersistentApiTokenToast(o.tokenFeature || 'API-функции скрипта', false);
            throwError('API token is not configured');
        }
        if (/[^\x20-\x7e]/.test(API_SETTINGS.token)) {
            showPersistentApiTokenToast(o.tokenFeature || 'API-функции скрипта', true);
            throwError('API token contains invalid characters');
        }
        const url = new URL(path, 'https://prod-api.lzt.market');
        if (o.query) {
            Object.keys(o.query).forEach(key => {
                const value = o.query[key];
                if (value == null || value === '') return;
                if (Array.isArray(value)) value.forEach(v => url.searchParams.append(key, String(v)));
                else url.searchParams.append(key, String(value));
            });
        }
        const headers = Object.assign({
            'Authorization': 'Bearer ' + API_SETTINGS.token,
            'Accept': 'application/json'
        }, o.headers || {});
        let body = null;
        if (o.data != null) {
            if (o.form) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
                const params = new URLSearchParams();
                Object.keys(o.data).forEach(key => {
                    const value = o.data[key];
                    if (value == null) return;
                    if (Array.isArray(value)) value.forEach(v => params.append(key, String(v)));
                    else params.append(key, String(value));
                });
                body = params.toString();
            } else {
                headers['Content-Type'] = 'application/json; charset=UTF-8';
                body = JSON.stringify(o.data);
            }
        }
        const parseAndCheck = (status, data) => {
            if (status < 200 || status >= 300) {
                const text = data && data.errors && data.errors[0] ? data.errors[0] : ('HTTP ' + status);
                notifyInvalidApiToken(text);
                throwError(text, '', { status, path: url.toString(), response: data || null });
            }
            if (data && data.errors && data.errors.length) {
                notifyInvalidApiToken(data.errors[0]);
                throwError(data.errors[0], '', { status, path: url.toString(), response: data });
            }
            return data;
        };
        const userscriptRequest = getUserscriptRequest();
        if (userscriptRequest) {
            return new Promise((resolve, reject) => {
                userscriptRequest({
                    method: o.method || 'GET',
                    url: url.toString(),
                    headers,
                    data: body,
                    onload: (resp) => {
                        try {
                            const data = parseJsonOrThrow(resp.responseText, 'API response is not valid JSON', { status: resp.status, path: url.toString() });
                            resolve(parseAndCheck(resp.status, data));
                        } catch (e) {
                            reject(e);
                        }
                    },
                    onerror: () => reject(createRequestError('GM_xmlhttpRequest failed', { method: o.method || 'GET', path: url.toString() })),
                    ontimeout: () => reject(createRequestError('API request timed out', { method: o.method || 'GET', path: url.toString() }))
                });
            });
        }
        throwError('Userscript request API is unavailable. Reinstall or update the script in Tampermonkey.');
    }

    function makeGmRequest(userscriptRequest, reqOpts, onload) {
        return new Promise((resolve, reject) => {
            const method = reqOpts.method || 'GET';
            const url = reqOpts.url;
            userscriptRequest(Object.assign({}, reqOpts, {
                onload: (resp) => onload(resp, resolve, reject),
                onerror:  () => reject(createRequestError('GM_xmlhttpRequest failed', { method, url })),
                ontimeout: () => reject(createRequestError('Request timed out',        { method, url }))
            }));
        });
    }

    async function remoteJsonFetch(url) {
        return makeGmRequest(requireUserscriptRequest(), { method: 'GET', url, headers: { 'Accept': 'application/json' } },
            (resp, resolve, reject) => {
                try {
                    if (resp.status < 200 || resp.status >= 300) throw createHttpError(resp.status, resp.responseText, 'HTTP', { method: 'GET', url });
                    resolve(parseJsonOrThrow(resp.responseText, 'Remote JSON response is not valid JSON', { status: resp.status, url }));
                } catch (e) { reject(e); }
            });
    }

    async function remoteTextFetch(url, options) {
        const opts = options || {};
        const headers = Object.assign({ 'Accept': 'text/html,application/xhtml+xml' }, opts.headers || {});
        return makeGmRequest(requireUserscriptRequest(), { method: 'GET', url, headers, anonymous: !!opts.anonymous },
            (resp, resolve, reject) => {
                const toObj = () => ({ text: resp.responseText || '', finalUrl: resp.finalUrl || resp.responseURL || '', headers: resp.responseHeaders || '' });
                if (resp.status < 200 || resp.status >= 300) {
                    if (opts.allowErrorResponseText && resp.responseText) { resolve(opts.returnResponseObject ? toObj() : resp.responseText); return; }
                    reject(createHttpError(resp.status, resp.responseText, 'HTTP', { method: 'GET', url }));
                    return;
                }
                resolve(opts.returnResponseObject ? toObj() : (resp.responseText || ''));
            });
    }

    let publishedAgeTimer = 0;
    let publishedAgeLoading = false;
    let publishedAgeCache = null;
    let publishedAgeScanTimer = 0;
    let publishedAgeLastSignature = '';
    let publishedAgeObserver = null;
    let publishedAgePending = false;
    const MARKET_INDEX_ITEM_SELECTOR = '.marketItemCard[id^="marketItem--"],.marketIndexItem[id^="marketItem--"]';

    function normalizePublishedAgeCache(raw) {
        const parsed = raw && typeof raw === 'object' ? raw : {};
        const now = Date.now();
        const out = Object.create(null);
        Object.keys(parsed).forEach(id => {
            const entry = parsed[id];
            if (!entry || !Number.isFinite(entry.publishedDate) || !entry.savedAt) return;
            if (now - entry.savedAt > PUBLISHED_AGE_CACHE_TTL) return;
            out[id] = entry;
        });
        return out;
    }

    function loadPublishedAgeCache() {
        if (publishedAgeCache) return publishedAgeCache;
        publishedAgeCache = loadStoredState(PUBLISHED_AGE_CACHE_KEY, Object.create(null), normalizePublishedAgeCache);
        return publishedAgeCache;
    }

    function savePublishedAgeCache() {
        if (!publishedAgeCache) return;
        const entries = Object.entries(publishedAgeCache).sort((a, b) => (b[1].savedAt || 0) - (a[1].savedAt || 0)).slice(0, 1000);
        saveStoredJson(PUBLISHED_AGE_CACHE_KEY, Object.fromEntries(entries));
    }

    function getMarketIndexItemId(item) {
        if (!item) return '';
        const id = (item.id || '').match(/marketItem--(\d+)/);
        if (id) return id[1];
        const link = item.querySelector('a.LinkClicker[href],a.text[href],a[href*="lzt.market/"]');
        if (!link) return '';
        try {
            const hrefId = new URL(link.getAttribute('href'), location.origin).pathname.match(/^\/(\d+)(?:\/|$)/);
            return hrefId ? hrefId[1] : '';
        } catch (_) { return ''; }
    }

    function extractPublishedDate(item) {
        if (!item || typeof item !== 'object') return 0;
        const value = Number(item.published_date || item.publishedDate || item.publish_date || item.created_date || 0);
        return Number.isFinite(value) && value > 0 ? value : 0;
    }

    function renderPublishedAge(item, publishedDate) {
        const id = getMarketIndexItemId(item);
        if (!id || !Number.isFinite(publishedDate) || publishedDate <= 0) return;
        // Новый дизайн: время объявления живёт прямо под заголовком в .itemTime.
        // Старые цели оставлены фолбэком для страниц, где карточки ещё не обновились.
        const target = item.querySelector('.itemTime')
            || item.querySelector('.marketIndexItem--otherInfo .muted')
            || item.querySelector('.marketIndexItem-inlineGroup .inline-info');
        if (!target) return;
        const days = Math.max(0, Math.floor((Date.now() / 1000 - publishedDate) / 86400));
        let badge = item.querySelector('.rarePublishedAge');
        if (!badge) {
            badge = createNode('span', 'rarePublishedAge');
            badge.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.25 5.75h9.5M5.25 2.5v2.25m5.5-2.25v2.25M4.5 3.75h7A1.5 1.5 0 0 1 13 5.25v6.25a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 11.5V5.25a1.5 1.5 0 0 1 1.5-1.5Z"/></svg><span class="rarePublishedAgeValue"></span><span class="rarePublishedAgeSuffix">с публикации</span>';
        }
        if (badge.parentElement !== target) target.appendChild(badge);
        const value = badge.querySelector('.rarePublishedAgeValue');
        if (value) value.textContent = days + ' ' + pluralDays(days);
        badge.title = 'Объявление опубликовано ' + days + ' ' + pluralDays(days) + ' назад';
        badge.setAttribute('aria-label', badge.title);
        const lvl = levelForDays(days);
        badge.style.setProperty('--rare-published-rgb', hexToRgbList(lvl.color));
        applyLevelStyle(badge, lvl.color, lvl.effect);
    }

    const publishedAgeEnabled = () => !!(API_SETTINGS && API_SETTINGS.publishedAgeEnabled !== false);

    const clearPublishedAgeBadges = () => { document.querySelectorAll('.rarePublishedAge').forEach(el => el.remove()); };

    function stopPublishedAgeWatcher() {
        clearTimeout(publishedAgeTimer);
        clearTimeout(publishedAgeScanTimer);
        publishedAgeTimer = 0;
        publishedAgeScanTimer = 0;
        publishedAgePending = false;
        if (publishedAgeObserver) {
            publishedAgeObserver.disconnect();
            publishedAgeObserver = null;
        }
        clearPublishedAgeBadges();
    }

    function applyPublishedAgeCache() {
        if (!publishedAgeEnabled()) { clearPublishedAgeBadges(); return; }
        if (isMarketRootPage()) { clearPublishedAgeBadges(); return; } // не на главной
        const cache = loadPublishedAgeCache();
        document.querySelectorAll(MARKET_INDEX_ITEM_SELECTOR).forEach(item => {
            const id = getMarketIndexItemId(item);
            if (id && cache[id]) renderPublishedAge(item, cache[id].publishedDate);
        });
    }

    function queuePublishedAgeUpdate() {
        if (!publishedAgeEnabled()) { stopPublishedAgeWatcher(); return; }
        if (isMarketRootPage()) { stopPublishedAgeWatcher(); return; } // не на главной
        applyPublishedAgeCache();
        if (!hasApiToken()) return;
        clearTimeout(publishedAgeTimer);
        publishedAgeTimer = setTimeout(fetchMissingPublishedAges, PUBLISHED_AGE_BATCH_DELAY);
    }

    function schedulePublishedAgeScan() {
        if (publishedAgeScanTimer) return;
        publishedAgeScanTimer = setTimeout(() => {
            publishedAgeScanTimer = 0;
            const ids = Array.from(document.querySelectorAll(MARKET_INDEX_ITEM_SELECTOR)).map(getMarketIndexItemId).filter(Boolean);
            const signature = ids.join(',');
            if (signature && signature !== publishedAgeLastSignature) {
                publishedAgeLastSignature = signature;
                queuePublishedAgeUpdate();
            }
        }, 800);
    }

    function ensurePublishedAgeWatcher() {
        if (!publishedAgeEnabled()) { stopPublishedAgeWatcher(); return; }
        if (isMarketRootPage()) { stopPublishedAgeWatcher(); return; } // не на главной
        if (publishedAgeObserver || !document.body) return;
        publishedAgeObserver = new MutationObserver(records => {
            if (records.some(record => Array.from(record.addedNodes).some(node => node && node.nodeType === 1 && (node.matches && node.matches(MARKET_INDEX_ITEM_SELECTOR) || node.querySelector && node.querySelector(MARKET_INDEX_ITEM_SELECTOR))))) {
                schedulePublishedAgeScan();
            }
        });
        publishedAgeObserver.observe(document.body, { childList: true, subtree: true });
        window.addEventListener('scroll', schedulePublishedAgeScan, { passive: true });
        setTimeout(schedulePublishedAgeScan, 1000);
    }

    function getCategoryApiPathFromLocation() {
        const parts = location.pathname.split('/').filter(Boolean);
        if (!parts.length) return '/';
        const category = parts[0].toLowerCase();
        if (!/^[a-z0-9_-]+$/.test(category)) return '';
        if (/^\d+$/.test(category) || category === 'user' || category === 'account' || category === 'cart') return '';
        return '/' + category;
    }

    // Главная страница маркета (корень lzt.market/) — там товары разных категорий
    // вперемешку. Дни с публикации показываем ТОЛЬКО в категориях, не на корне.
    function isMarketRootPage() {
        return location.pathname.split('/').filter(Boolean).length === 0;
    }

    function getLocationQueryObject() {
        const query = Object.create(null);
        const params = new URLSearchParams(location.search || '');
        params.forEach((value, key) => {
            if (key === '_xfToken' || key === '_xfRequestUri' || key === '_xfNoRedirect') return;
            if (query[key] == null) query[key] = value;
            else if (Array.isArray(query[key])) query[key].push(value);
            else query[key] = [query[key], value];
        });
        return query;
    }

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    async function fetchCurrentCategoryItems(page) {
        const path = getCategoryApiPathFromLocation();
        if (!path) return null;
        const query = Object.assign(getLocationQueryObject(), { parse_same_item_ids: false });
        if (page) query.page = page;
        return await apiFetch(path, { method: 'GET', query, tokenFeature: 'Показ дней с публикации' });
    }

    function getPublishedApiItems(data) {
        const items = [];
        if (data && Array.isArray(data.items)) items.push(...data.items);
        if (data && Array.isArray(data.stickyItems)) items.push(...data.stickyItems);
        return items.filter(item => item && item.item_id && extractPublishedDate(item));
    }

    async function fetchMissingPublishedAges() {
        if (!publishedAgeEnabled()) return;
        if (isMarketRootPage()) return; // на главной дни с публикации не показываем
        if (!hasApiToken()) {
            showPersistentApiTokenToast('Показ дней с публикации', false);
            return;
        }
        if (publishedAgeLoading) { publishedAgePending = true; return; }
        const cache = loadPublishedAgeCache();
        const items = Array.from(document.querySelectorAll(MARKET_INDEX_ITEM_SELECTOR));
        const ids = new Set(items.map(getMarketIndexItemId).filter(Boolean).filter(id => !cache[id]));
        if (!ids.size) return;
        publishedAgeLoading = true;
        showPublishedAgeProgressToast('Считаю дни с публикации… (' + ids.size + ')');
        try {
            const basePage = Math.max(1, parseInt(new URLSearchParams(location.search || '').get('page'), 10) || 1);
            for (let offset = 0; offset < PUBLISHED_AGE_MAX_PAGES && ids.size; offset++) {
                if (offset > 0) await delay(PUBLISHED_AGE_PAGE_DELAY);
                const data = await fetchCurrentCategoryItems(basePage + offset);
                const pageItems = getPublishedApiItems(data);
                if (!pageItems.length) {
                    break;
                }
                const now = Date.now();
                pageItems.forEach(apiItem => {
                    const id = String(apiItem && apiItem.item_id || '');
                    const publishedDate = extractPublishedDate(apiItem);
                    if (!ids.has(id) || !publishedDate) return;
                    cache[id] = { publishedDate, savedAt: now };
                    ids.delete(id);
                });
                savePublishedAgeCache();
                applyPublishedAgeCache();
                if (data && data.hasNextPage === false) break;
            }
            hidePublishedAgeProgressToast();
        } catch (e) {
            logScriptError('published age failed', e);
            showPublishedAgeErrorToast(formatErrorText(e, 'ошибка запроса'));
        } finally {
            publishedAgeLoading = false;
            if (publishedAgePending) {
                publishedAgePending = false;
                queuePublishedAgeUpdate();
            }
        }
    }

    const CSGO_MARKET_PRICE_CACHE_KEY = 'rareCsgoMarketPriceCache_v1';
    const CSGO_MARKET_PRICE_CACHE_TTL = 6 * 60 * 60 * 1000;
    let csgoMarketPricesPromise = null;

    function loadCsgoMarketPriceCache() {
        const parsed = loadStoredJson(CSGO_MARKET_PRICE_CACHE_KEY, null);
        if (!parsed || typeof parsed !== 'object' || !parsed.savedAt || !parsed.prices) return null;
        return parsed;
    }

    const saveCsgoMarketPriceCache = (prices) => { saveStoredJson(CSGO_MARKET_PRICE_CACHE_KEY, { savedAt: Date.now(), prices }); };

    function clearCsgoMarketPriceCache() {
        try { storageRemove(CSGO_MARKET_PRICE_CACHE_KEY); } catch (_) {}
        csgoMarketPricesPromise = null;
    }

    function canonicalizeCsgoMarketLookupName(name) {
        return String(name || '')
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+\(\)$/, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    function buildCsgoMarketPriceIndex(prices) {
        const exact = Object.create(null);
        const canonical = Object.create(null);
        Object.keys(prices || {}).forEach(name => {
            exact[name] = prices[name];
            const key = canonicalizeCsgoMarketLookupName(name);
            if (!(key in canonical) || prices[name] < canonical[key].price) canonical[key] = { name, price: prices[name] };
        });
        return { exact, canonical };
    }

    function lookupCsgoMarketPrice(index, name) {
        if (!index || !name) return null;
        if (Object.prototype.hasOwnProperty.call(index.exact, name)) return { name, price: index.exact[name] };
        const canonicalKey = canonicalizeCsgoMarketLookupName(name);
        return index.canonical[canonicalKey] || null;
    }

    async function getCsgoMarketMinPrices(forceRefresh) {
        if (!forceRefresh && csgoMarketPricesPromise) return csgoMarketPricesPromise;
        csgoMarketPricesPromise = (async () => {
        const cached = loadCsgoMarketPriceCache();
        if (!forceRefresh && cached && (Date.now() - cached.savedAt) < CSGO_MARKET_PRICE_CACHE_TTL) return cached.prices;
        const data = await remoteJsonFetch('https://market.csgo.com/api/v2/prices/RUB.json');
        const byName = Object.create(null);
        (data.items || []).forEach(item => {
            const name = item && item.market_hash_name;
            const price = Number(item && item.price);
            if (!name || !Number.isFinite(price) || price <= 0) return;
            if (!(name in byName) || price < byName[name]) byName[name] = price;
        });
        saveCsgoMarketPriceCache(byName);
        return byName;
        })();
        try {
            return await csgoMarketPricesPromise;
        } finally {
            if (forceRefresh) csgoMarketPricesPromise = null;
        }
    }

    function normalizeCsgoMarketItemName(name) {
        return String(name || '')
            .replace(/[\r\n]+/g, ' ')
            .replace(/\s+\(\)$/, '')
            .trim();
    }

    function getSteamValueItemQuantity(item) {
        const priceBox = item && item.querySelector('.lztSv--item--price--new');
        const qtyNode = priceBox
            ? Array.from(priceBox.querySelectorAll('.Tooltip')).find(node => /x\s*\d+\s*шт\./i.test(String(node.textContent || '')))
            : null;
        const text = String(qtyNode ? qtyNode.textContent : '').trim();
        const match = text.match(/x\s*(\d+)\s*шт\./i);
        return match ? Math.max(1, parseInt(match[1], 10) || 1) : 1;
    }

    const isSteamValueItemAvailable = (item) => !!(item && item.classList && item.classList.contains('marketable') && item.classList.contains('tradable'));

    function getSteamValueItemEntries(root) {
        const scope = root || document;
        return Array.from(scope.querySelectorAll('.lztSv--item')).map(item => {
            const link = item.querySelector('.lztSv_link--item-new[href*="/market/listings/"]');
            const href = link && link.href ? link.href : '';
            const appIdMatch = href.match(/\/market\/listings\/(\d+)\//i);
            if (appIdMatch && appIdMatch[1] !== '730') return null;
            let name = '';
            if (href) {
                const match = href.match(/\/market\/listings\/730\/([^?#]+)/i);
                if (match) {
                    try {
                        name = normalizeCsgoMarketItemName(decodeURIComponent(match[1]));
                    } catch (_) {}
                }
            }
            if (!name) {
                const img = item.querySelector('.lztSv--item--img[alt]');
                name = normalizeCsgoMarketItemName(img && img.getAttribute('alt') || '');
            }
            return name ? { name, qty: getSteamValueItemQuantity(item), available: isSteamValueItemAvailable(item) } : null;
        }).filter(Boolean);
    }

    function getCsgoMarketItemCategory(name) {
        const base = String(name || '').split(' | ')[0].trim();
        if (!base) return 'Item';
        if (/^(Sticker|Patch|Graffiti|Sealed Graffiti|Music Kit|Charm)\b/i.test(base)) return base.replace(/\s+/g, '%20');
        if (/^(AK-47|M4A1-S|M4A4|AUG|FAMAS|Galil AR|SG 553|SSG 08|AWP|G3SG1|SCAR-20)$/i.test(base)) return 'Rifle/' + encodeURIComponent(base);
        if (/^(Glock-18|USP-S|P2000|P250|Five-SeveN|CZ75-Auto|Desert Eagle|Dual Berettas|Tec-9|R8 Revolver)$/i.test(base)) return 'Pistol/' + encodeURIComponent(base);
        if (/^(MAC-10|MP9|MP7|MP5-SD|UMP-45|PP-Bizon|P90)$/i.test(base)) return 'SMG/' + encodeURIComponent(base);
        if (/^(Nova|XM1014|MAG-7|Sawed-Off)$/i.test(base)) return 'Shotgun/' + encodeURIComponent(base);
        if (/^(M249|Negev)$/i.test(base)) return 'Machinegun/' + encodeURIComponent(base);
        if (/^(Knife|Bayonet|Karambit|M9 Bayonet|Flip Knife|Gut Knife|Huntsman Knife|Falchion Knife|Bowie Knife|Butterfly Knife|Shadow Daggers|Navaja Knife|Stiletto Knife|Talon Knife|Ursus Knife|Skeleton Knife|Nomad Knife|Paracord Knife|Survival Knife|Classic Knife|Kukri Knife)\b/i.test(base)) return 'Knife/' + encodeURIComponent(base);
        if (/^(Broken Fang Gloves|Moto Gloves|Sport Gloves|Specialist Gloves|Driver Gloves|Hand Wraps|Hydra Gloves|Bloodhound Gloves)\b/i.test(base)) return 'Gloves/' + encodeURIComponent(base);
        if (/^(Agent|Cmdr\.|Lt\. Commander|Sir Bloody|Number K|Chem-Haz|Rezan|Maximus|Dragomir|Michael Syfers|B Squadron Officer|Primeiro Tenente|Enforcer|Soldier|Ground Rebel|Osiris|The Elite Mr\. Muhlik|Trapper|Prof\. Shahmat|Bloody Darryl)\b/i.test(base)) return 'Agent/' + encodeURIComponent(base);
        return 'Item/' + encodeURIComponent(base);
    }

    function buildCsgoMarketItemUrl(name) {
        if (!name) return '';
        return 'https://market.csgo.com/ru/' + getCsgoMarketItemCategory(name) + '/' + encodeURIComponent(name);
    }

    function ensureChildNode(parent, className) {
        if (!parent) return null;
        let node = parent.querySelector('.' + className);
        if (!node) { node = createNode('div', className); parent.appendChild(node); }
        return node;
    }
    function ensureSteamValueExtraNode() {
        return ensureChildNode(document.querySelector('.LztSvResult--totalValue'), 'rareSteamValueExtra');
    }

    const cs2InventoryPriceEnabled = () => !(API_SETTINGS && API_SETTINGS.cs2InventoryPriceEnabled === false);

    function clearSteamInventoryMarketPrice() {
        document.querySelectorAll('.rareSteamValueExtra, .rareSteamCounterExtra, .rareSteamItemExtraPrice').forEach(el => el.remove());
    }

    function getSteamValueOriginalTotal(root) {
        const scope = root || document;
        const node = scope.querySelector('.LztSvResult--totalValue .Value.mainc[data-value], #FilteredInventoryCostValue[data-value]');
        const value = Number(node && node.getAttribute('data-value'));
        return Number.isFinite(value) && value > 0 ? value : 0;
    }

    // Оригинальная (Steam) стоимость ТОЛЬКО CS2-инвентаря — сумма цен по каждому
    // CS2-предмету (app_id=730), а не общий тотал страницы. Нужно, т.к. страница
    // steam-value может показывать несколько игр: тогда .LztSvResult--totalValue
    // включает чужие игры, и процент (числитель=только CS2) считался бы от неверной базы.
    // data-value предмета = его оригинальная стоимость (в тех же единицах, что тотал).
    function getSteamValueCs2OriginalTotal(root) {
        const scope = root || document;
        let sum = 0;
        let counted = 0;
        scope.querySelectorAll('.lztSv--item').forEach(item => {
            const link = item.querySelector('.lztSv_link--item-new[href*="/market/listings/"]');
            const href = link && link.href ? link.href : '';
            const appIdMatch = href.match(/\/market\/listings\/(\d+)\//i);
            // Только CS2. Если ссылки нет — не можем подтвердить принадлежность, пропускаем.
            if (!appIdMatch || appIdMatch[1] !== '730') return;
            // Оригинальная цена предмета: ищем data-value ТОЛЬКО в оригинальном блоке цены
            // LZT, ЯВНО исключая нашу вставку .rareSteamItemExtraPrice. Берём последний
            // .Value[data-value] (у LZT это итоговая стоимость позиции), не наш span.
            const priceBox = item.querySelector('.lztSv--item--price--new');
            if (!priceBox) return;
            const valueNodes = Array.from(priceBox.querySelectorAll('.Value[data-value]'))
                .filter(n => !n.closest('.rareSteamItemExtraPrice'));
            const priceNode = valueNodes[valueNodes.length - 1];
            const value = Number(priceNode && priceNode.getAttribute('data-value'));
            if (Number.isFinite(value) && value > 0) { sum += value; counted++; }
        });
        return counted ? sum : 0;
    }

    // База для процента считается так:
    //  - если на странице ЕСТЬ предметы других игр (не CS2) — общий тотал страницы
    //    включает их, поэтому берём просуммированную оригинальную стоимость только
    //    CS2-предметов (getSteamValueCs2OriginalTotal);
    //  - если инвентарь ЦЕЛИКОМ CS2 (нет чужих игр) — общий тотал страницы и есть
    //    стоимость CS2, и он точнее поштучной суммы (не зависит от парсинга data-value).
    function getSteamValueCs2Base(root) {
        const scope = root || document;
        const allItems = Array.from(scope.querySelectorAll('.lztSv--item'));
        const nonCs2 = allItems.some(item => {
            const link = item.querySelector('.lztSv_link--item-new[href*="/market/listings/"]');
            const href = link && link.href ? link.href : '';
            const m = href.match(/\/market\/listings\/(\d+)\//i);
            return m && m[1] !== '730';
        });
        const total = getSteamValueOriginalTotal(root);
        if (!nonCs2 && total > 0) return total; // инвентарь весь CS2 → тотал = CS2-стоимость
        const cs2 = getSteamValueCs2OriginalTotal(root);
        return cs2 > 0 ? cs2 : total;
    }

    function formatSteamValueDeltaText(originalTotal, marketTotal) {
        if (!Number.isFinite(originalTotal) || originalTotal <= 0 || !Number.isFinite(marketTotal)) return '';
        const delta = ((marketTotal - originalTotal) / originalTotal) * 100;
        const sign = delta > 0 ? '+' : '';
        return sign + delta.toFixed(1).replace('.', ',') + '%';
    }

    function getPricePlateDaybreakWarning() {
        const daybreak = getCurrentDaybreak();
        if (!Number.isFinite(daybreak) || daybreak <= 365) return '';
        return 'Отлега этого аккаунта ' + daybreak + '-дней, найденных аккаунтов может быть крайне мало или не быть вообще, рекомендуется перейти по внешней ссылке и понизить отлегу для более точной цены';
    }

    function isCsgoSteamValueUrl(url) {
        if (!url) return false;
        try {
            const parsed = new URL(url, location.origin);
            return parsed.searchParams.get('app_id') === '730';
        } catch (e) {}
        return /[?&]app_id=730(?:[&#]|$)/i.test(String(url || ''));
    }

    function buildCurrentSteamValueUrl() {
        const itemId = ((location.pathname || '').match(/\/(\d+)(?:[/?#]|$)/) || [])[1];
        if (!itemId) return '';
        return 'https://lzt.market/steam-value/?link=' + encodeURIComponent('https://lzt.market/' + itemId + '/') + '&app_id=730&currency=rub';
    }

    const ensureSteamCounterExtraNode = counter => ensureChildNode(counter, 'rareSteamCounterExtra');

    function getSteamValueHiddenInventoryMessage(rootOrHtml) {
        if (typeof rootOrHtml === 'string') {
            const html = rootOrHtml.replace(/\s+/g, ' ').trim();
            return /Инвентарь данного профиля скрыт\./i.test(html)
                ? 'Инвентарь данного профиля скрыт.'
                : '';
        }
        const scope = rootOrHtml || document;
        const bodyText = String(scope.body ? scope.body.textContent : '').replace(/\s+/g, ' ').trim();
        return /Инвентарь данного профиля скрыт\./i.test(bodyText) ? 'Инвентарь данного профиля скрыт.' : '';
    }

    async function fetchSteamValuePageSummary(url) {
        if (!cs2InventoryPriceEnabled()) return null;
        if (!url) return null;
        const html = await remoteTextFetch(url, { allowErrorResponseText: true });
        const hiddenInventoryMessage = getSteamValueHiddenInventoryMessage(html);
        if (hiddenInventoryMessage) return { hiddenInventoryMessage };
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (getSteamValueOriginalTotal(doc) <= 0) return null;
        const entries = getSteamValueItemEntries(doc).filter(entry => entry.available);
        if (!entries.length) return null;
        let prices = await getCsgoMarketMinPrices();
        let priceIndex = buildCsgoMarketPriceIndex(prices);
        let missing = entries.filter(entry => !lookupCsgoMarketPrice(priceIndex, entry.name));
        if (missing.length) {
            clearCsgoMarketPriceCache();
            prices = await getCsgoMarketMinPrices(true);
            priceIndex = buildCsgoMarketPriceIndex(prices);
        }
        let total = 0;
        let found = 0;
        entries.forEach(entry => {
            const match = lookupCsgoMarketPrice(priceIndex, entry.name);
            if (!match || !Number.isFinite(match.price)) return;
            total += match.price * entry.qty;
            found += entry.qty;
        });
        const totalItems = entries.reduce((sum, entry) => sum + entry.qty, 0);
        return total > 0 ? { total, found, totalItems, deltaText: formatSteamValueDeltaText(getSteamValueCs2Base(doc), total) } : null;
    }

    async function buildSteamItemPageInventoryMarketPrice() {
        if (!cs2InventoryPriceEnabled()) { clearSteamInventoryMarketPrice(); return; }
        const title = document.getElementById('steamInventoryCounters');
        const counter = document.querySelector('.marketItemView--counters .counter .label.steam--730--invValue')?.closest('.counter');
        const link = (counter && counter.querySelector('a[href*="/steam-value/"]')) || document.querySelector('.label.steam--730--invValue a[href*="/steam-value/"]');
        const steamValueUrl = (link && link.href) || (counter ? buildCurrentSteamValueUrl() : '');
        if (!title || !steamValueUrl || !isCsgoSteamValueUrl(steamValueUrl)) return;
        const extra = ensureSteamCounterExtraNode(title);
        if (!extra || extra.dataset.loading === '1' || extra.dataset.done === '1') return;
        extra.dataset.loading = '1';
        extra.textContent = 'Считаю цену...';
        try {
            const summary = await fetchSteamValuePageSummary(steamValueUrl);
            if (!summary) {
                extra.textContent = '';
                extra.dataset.done = '1';
                return;
            }
            if (summary.hiddenInventoryMessage) {
                extra.textContent = summary.hiddenInventoryMessage;
                extra.dataset.done = '1';
                return;
            }
            extra.innerHTML = escHtml(formatMarketCsgoMoney(summary.total) + ' (' + summary.found + '/' + summary.totalItems + ')') + (summary.deltaText ? '<div class="rareSteamValueExtraDelta">' + escHtml(summary.deltaText) + '</div>' : '');
            extra.dataset.done = '1';
        } catch (_) {
            extra.textContent = '';
            extra.dataset.done = '1';
        } finally {
            delete extra.dataset.loading;
        }
    }

    function bindSteamValueExtraActions(extra) {
        if (!extra) return;
        const refreshBtn = extra.querySelector('.rareSteamValueExtraRefresh');
        if (refreshBtn && refreshBtn.dataset.bound !== '1') {
            refreshBtn.dataset.bound = '1';
            refreshBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                clearCsgoMarketPriceCache();
                await buildSteamInventoryMarketPrice(true);
            });
        }
    }

    function ensureSteamValueItemPriceBox(item) {
        if (!item) return null;
        let priceBox = item.querySelector('.lztSv--item--price--new');
        if (priceBox) return priceBox;
        const mainInfo = item.querySelector('.lztSv_item_mainInfo_container');
        if (!mainInfo) return null;
        const divider = createNode('div', 'lztSv_item_divider');
        priceBox = createNode('div', 'lztSv--item--price--new');
        mainInfo.appendChild(divider);
        mainInfo.appendChild(priceBox);
        return priceBox;
    }

    function resolveSteamValueItemName(item) {
        const link = item.querySelector('.lztSv_link--item-new[href*="/market/listings/730/"]');
        if (link && link.href) {
            const match = link.href.match(/\/market\/listings\/730\/([^?#]+)/i);
            if (match) {
                try { return normalizeCsgoMarketItemName(decodeURIComponent(match[1])); } catch (_) {}
            }
        }
        const img = item.querySelector('.lztSv--item--img[alt]');
        return normalizeCsgoMarketItemName(img && img.getAttribute('alt') || '');
    }

    const buildSteamItemExtraPriceHtml = (match, qty) => {
        if (!match || !Number.isFinite(match.price)) {
            return { muted: true, html: '<span class="rareSteamItemExtraMain"><span class="Value">—</span></span>' };
        }
        const href = buildCsgoMarketItemUrl(match.name);
        return {
            muted: false,
            html: '<span class="rareSteamItemExtraMain"><span class="Value">' + escHtml(formatMarketCsgoMoney(match.price)) + (qty > 1 ? ' x ' + qty + ' шт.' : '') + '</span></span>'
                + (href ? '<a class="rareSteamItemExtraLink" href="' + escHtml(href) + '" target="_blank" rel="nofollow noopener noreferrer" title="Открыть на market.csgo.com">' + externalLinkSvg() + '</a>' : '')
        };
    };

    function renderSteamValueItemPrices(prices) {
        const priceIndex = buildCsgoMarketPriceIndex(prices);
        document.querySelectorAll('.lztSv--item').forEach(item => {
            const priceBox = ensureSteamValueItemPriceBox(item);
            if (!priceBox) return;
            priceBox.style.display = 'flex';
            priceBox.style.flexDirection = 'column';
            priceBox.style.alignItems = 'flex-start';
            let extra = priceBox.querySelector('.rareSteamItemExtraPrice');
            if (!extra) {
                extra = createNode('div', 'rareSteamItemExtraPrice');
                priceBox.appendChild(extra);
            }
            const name = resolveSteamValueItemName(item);
            const qty = getSteamValueItemQuantity(item);
            const match = name ? lookupCsgoMarketPrice(priceIndex, name) : null;
            const rendered = buildSteamItemExtraPriceHtml(match, qty);
            extra.classList.toggle('muted', rendered.muted);
            extra.innerHTML = rendered.html;
        });
    }

    async function buildSteamInventoryMarketPrice(forceRefresh) {
        if (!cs2InventoryPriceEnabled()) { clearSteamInventoryMarketPrice(); return; }
        const totalBox = document.querySelector('.LztSvResult--totalValue');
        const items = document.querySelectorAll('.lztSv--item');
        if (!totalBox || !items.length) return;
        const extra = ensureSteamValueExtraNode();
        if (!extra) return;
        if (extra.dataset.loading === '1') return;
        const hiddenInventoryMessage = getSteamValueHiddenInventoryMessage(document);
        if (hiddenInventoryMessage) {
            extra.classList.add('muted');
            extra.textContent = hiddenInventoryMessage;
            extra.dataset.done = '1';
            renderSteamValueItemPrices(Object.create(null));
            return;
        }
        if (getSteamValueOriginalTotal() <= 0) {
            renderSteamValueItemPrices(Object.create(null));
            extra.textContent = '';
            delete extra.dataset.done;
            return;
        }
        const entries = getSteamValueItemEntries();
        if (!entries.length) return;
        extra.dataset.loading = '1';
        extra.classList.add('muted');
        extra.textContent = 'Считаю цену инвентаря...';
        try {
            let prices = await getCsgoMarketMinPrices(forceRefresh);
            let priceIndex = buildCsgoMarketPriceIndex(prices);
            const availableEntries = entries.filter(entry => entry.available);
            let missing = availableEntries.filter(entry => !lookupCsgoMarketPrice(priceIndex, entry.name));
            if (missing.length && !forceRefresh) {
                clearCsgoMarketPriceCache();
                prices = await getCsgoMarketMinPrices(true);
                priceIndex = buildCsgoMarketPriceIndex(prices);
                missing = availableEntries.filter(entry => !lookupCsgoMarketPrice(priceIndex, entry.name));
            }
            let total = 0;
            let found = 0;
            availableEntries.forEach(entry => {
                const match = lookupCsgoMarketPrice(priceIndex, entry.name);
                if (!match || !Number.isFinite(match.price)) return;
                total += match.price * entry.qty;
                found += entry.qty;
            });
            renderSteamValueItemPrices(prices);
            extra.classList.remove('muted');
            const totalItems = availableEntries.reduce((sum, entry) => sum + entry.qty, 0);
            const deltaText = formatSteamValueDeltaText(getSteamValueCs2Base(), total);
            extra.innerHTML = '<div class="Value mainc">' + escHtml(formatMarketCsgoMoney(total) + ' (' + found + '/' + totalItems + ')') + '<span class="rareSteamValueExtraIcon">' + marketCsgoSvg() + '</span><button type="button" class="rareSteamValueExtraRefresh" title="Перепарсить цены" aria-label="Перепарсить цены">' + refreshSvg() + '</button></div>' + (deltaText ? '<div class="rareSteamValueExtraDelta">' + escHtml(deltaText) + '</div>' : '');
            bindSteamValueExtraActions(extra);
        } catch (e) {
            logScriptError('market.csgo.com inventory price failed', e);
            renderSteamValueItemPrices(Object.create(null));
            extra.classList.add('muted');
            extra.textContent = 'Не удалось загрузить цену';
        } finally {
            delete extra.dataset.loading;
        }
    }

    function formatMoneyCore(value, decimalSep, suffix) {
        const n = Number(value || 0);
        if (!Number.isFinite(n)) return '0' + suffix;
        const fixed = Math.abs(n % 1) > 0.001 ? n.toFixed(2) : String(Math.round(n));
        const parts = fixed.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return parts[0] + (parts[1] ? decimalSep + parts[1] : '') + suffix;
    }
    function formatMoney(value, currency) {
        return formatMoneyCore(value, '.', currency ? ' ' + currency.toUpperCase() : '');
    }
    function formatPricePlateMoney(value, currency) {
        const n = Number(value || 0);
        if (!Number.isFinite(n)) return '0';
        return String(Math.round(n)) + (currency ? ' ' + currency.toUpperCase() : '');
    }
    const formatMarketCsgoMoney = value => formatMoneyCore(value, ',', ' ₽');

    function formatDateInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const offsetMinutes = -date.getTimezoneOffset();
        const sign = offsetMinutes >= 0 ? '+' : '-';
        const absOffset = Math.abs(offsetMinutes);
        const offsetHours = String(Math.floor(absOffset / 60)).padStart(2, '0');
        const offsetMins = String(absOffset % 60).padStart(2, '0');
        return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes + ':' + seconds + sign + offsetHours + ':' + offsetMins;
    }

    function average(nums) {
        if (!nums.length) return 0;
        return nums.reduce((sum, n) => sum + n, 0) / nums.length;
    }

    function formatTimeLabel(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const hh = String(date.getHours()).padStart(2, '0');
        const mm = String(date.getMinutes()).padStart(2, '0');
        return hh + ':' + mm;
    }

    function loadStatsCache() {
        return loadStoredState(STATS_CACHE_KEY, null, parsed => {
            return parsed && typeof parsed === 'object' && parsed.stats && parsed.savedAt ? parsed : null;
        });
    }

    const saveStatsCache = (stats) => { saveStoredJson(STATS_CACHE_KEY, { savedAt: Date.now(), stats }); };

    // Пер-предметный кэш цен: min/avg/count + время сохранения, отдельно на каждый скин.
    const ITEM_PRICE_CACHE_KEY = 'rareItemPrice_cache_v1';
    function priceCacheKeyFor(meta) {
        if (!meta || !meta.kind) return '';
        if (meta.kind === 'riot-skin' || meta.kind === 'riot-buddy' || meta.kind === 'steam-game') {
            return meta.kind + ':' + (meta.itemId || '');
        }
        if (meta.kind === 'fortnite-item') {
            return meta.kind + ':' + (meta.dataKey || '') + ':' + (meta.itemId || '');
        }
        if (meta.kind === 'lol-title') {
            return meta.kind + ':' + (meta.name || '');
        }
        return meta.kind + ':' + (meta.itemId || meta.name || '');
    }
    const loadItemPriceCache = () => loadStoredObject(ITEM_PRICE_CACHE_KEY);
    function getCachedItemPrice(meta) {
        const key = priceCacheKeyFor(meta);
        if (!key) return null;
        const entry = loadItemPriceCache()[key];
        if (!entry || !entry.stats || !entry.savedAt) return null;
        return entry;
    }
    function saveCachedItemPrice(meta, stats, errorText) {
        const key = priceCacheKeyFor(meta);
        if (!key) return;
        updateStoredObject(ITEM_PRICE_CACHE_KEY, all => {
            all[key] = { savedAt: Date.now(), stats, errorText: errorText || '' };
        });
    }

    function saveCachedItemPriceError(meta, errorText) {
        const key = priceCacheKeyFor(meta);
        if (!key) return;
        updateStoredObject(ITEM_PRICE_CACHE_KEY, all => {
            const entry = all[key];
            if (!entry || !entry.stats || !entry.savedAt) return false;
            entry.errorText = errorText || '';
        });
    }

    function getProfitStatsRanges() {
        const now = new Date();
        return [
            { key: 'day', label: 'день', start: new Date(now.getTime() - 86400000) },
            { key: 'week', label: '7 дней', start: new Date(now.getTime() - 6 * 86400000) },
            { key: 'month', label: 'месяц', start: new Date(now.getTime() - 29 * 86400000) }
        ].map(item => Object.assign(item, { end: now }));
    }

    async function fetchPaymentsHistoryByType(type, range) {
        let operationIdLt = 0;
        const payments = [];
        let paymentStats = null;
        while (true) {
            const data = await apiFetch('/user/payments', {
                query: {
                    type,
                    category_id: 0,
                    startDate: formatDateInput(range.start),
                    endDate: formatDateInput(range.end),
                    show_payment_stats: 1,
                    operation_id_lt: operationIdLt || ''
                },
                tokenFeature: 'Статистика профита'
            });
            if (!paymentStats && data && data.paymentStats) paymentStats = data.paymentStats;
            const pagePayments = data && data.payments ? Object.values(data.payments) : [];
            payments.push.apply(payments, pagePayments);
            if (!data || !data.hasNextPage || !data.lastOperationId || !pagePayments.length) break;
            operationIdLt = data.lastOperationId;
        }
        return { payments, paymentStats };
    }

    async function fetchProfitStats() {
        const result = {};
        const ranges = getProfitStatsRanges();
        for (const range of ranges) {
            const soldData = await fetchPaymentsHistoryByType('sold_item', range);
            const paidData = await fetchPaymentsHistoryByType('paid_item', range);
            const soldPayments = soldData.payments;
            const paidPayments = paidData.payments;
            const soldStats = soldData.paymentStats || {};
            const paidStats = paidData.paymentStats || {};
            const soldTotal = soldStats.incoming_value != null
                ? Number(soldStats.incoming_value || 0)
                : soldPayments.reduce((sum, p) => sum + Number(p.incoming_sum || p.sum || 0), 0);
            const paidTotal = paidStats.outgoing_value != null
                ? Number(paidStats.outgoing_value || 0)
                : paidPayments.reduce((sum, p) => sum + Number(p.outgoing_sum || p.sum || 0), 0);
            result[range.key] = {
                label: range.label,
                soldTotal,
                paidTotal,
                profit: soldTotal - paidTotal,
                salesCount: soldPayments.length,
                buysCount: paidPayments.length
            };
        }
        return result;
    }

    function ensureAutoTitleButton() {
        const editable = document.querySelector('.Editable.EditableValue[data-key="title"]');
        const aiWrap = editable && editable.parentElement ? editable.parentElement.querySelector('.AiTitleButton') : null;
        if (!editable || !aiWrap || document.getElementById('rareAutoTitleBtn')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'rareAutoTitleBtn';
        btn.className = 'rareAutoTitleBtn';
        btn.title = 'Собрать название из скинов и активности';
        const autoTitleBg = CUSTOM.modalBg || DEFAULT_CUSTOM.modalBg;
        const autoTitleAccent = CUSTOM.accentColor || DEFAULT_CUSTOM.accentColor;
        btn.style.setProperty('--rare-auto-title-rgb', hexToRgbList(autoTitleAccent));
        btn.style.setProperty('--rare-auto-title-bg', autoTitleBg);
        btn.style.setProperty('--rare-auto-title-fg', getThemeAccentForeground(autoTitleAccent, autoTitleBg));
        btn.innerHTML = '<span class="rareAutoTitleBtnIcon">' + magicSparklesSvg() + '</span>';
        btn.addEventListener('click', async () => {
            const nextTitle = buildAutoMarketTitle();
            if (!nextTitle) return;
            btn.disabled = true;
            const baseTitle = 'Собрать название из скинов и активности';
            btn.title = 'Сохраняю...';
            const saved = await saveEditableTitleValue(editable, nextTitle);
            btn.title = saved ? 'Название сохранено' : 'Не удалось сохранить название';
            if (saved) showThemeToast('Название применено');
            setTimeout(() => {
                btn.disabled = false;
                btn.title = baseTitle;
            }, 1200);
        });
        aiWrap.parentNode.insertBefore(btn, aiWrap);
    }

    function getCurrentRiotRegionCode() {
        const map = {
            [norm('Европа')]: 'EU',
            [norm('Азиатско-Тихоокеанский')]: 'AP',
            [norm('Корея')]: 'KR',
            [norm('Северная Америка')]: 'NA',
            [norm('Бразилия')]: 'BR',
            [norm('Латинская Америка')]: 'LA'
        };
        const counters = document.querySelectorAll('.marketItemView--counters .counter, .marketItemView--commonInfo .counter');
        for (const counter of counters) {
            const muted = counter.querySelector('.muted');
            if (norm(muted ? muted.textContent : '') !== norm('Регион')) continue;
            const label = counter.querySelector('.label');
            const key = norm(label ? label.textContent : '');
            if (map[key]) return map[key];
        }
        return '';
    }

    // --- Valorant: чтение данных строго из блока Valorant --------------------
    // Находит .marketItemView--counters, идущий сразу после <h4>Valorant</h4>
    // (именно Valorant, а не «League of Legends» и не «Достоверная информация»).
    function getValorantCountersBlock() {
        const heads = document.querySelectorAll('h4, h2, h3');
        for (const h of heads) {
            const t = norm(h.textContent);
            // строго "valorant", чтобы не поймать League of Legends / Достоверную инфу
            if (t !== norm('Valorant')) continue;
            let node = h.nextElementSibling;
            while (node) {
                if (node.classList && node.classList.contains('marketItemView--counters')) return node;
                if (/^h[1-6]$/i.test(node.tagName)) break; // дошли до следующего заголовка — блока нет
                node = node.nextElementSibling;
            }
        }
        return null;
    }
    // Возвращает текст .label по подписи .muted внутри блока Valorant.
    function getValorantCounterLabel(mutedText) {
        const block = getValorantCountersBlock();
        if (!block) return '';
        const counters = block.querySelectorAll('.counter');
        for (const c of counters) {
            const muted = c.querySelector('.muted');
            if (norm(muted ? muted.textContent : '') !== norm(mutedText)) continue;
            const label = c.querySelector('.label');
            return label ? label.textContent.replace(/\s+/g, ' ').trim() : '';
        }
        return '';
    }
    // Регион Valorant (display name с LZT), строго из блока Valorant.
    function getValorantRegionName() { return getValorantCounterLabel('Регион'); }
    // Ранг Valorant: берём «Текущий ранг» (display name с LZT).
    function getValorantRankName() { return getValorantCounterLabel('Текущий ранг'); }
    // Кол-во скинов Valorant: из заголовка «N скина» (type=weapons) с фолбэком на li.
    function getValorantSkinCount() {
        const ul = document.querySelector('ul[data-key="WeaponSkins"]');
        return getListItemCount(ul, 'weapons');
    }
    // Кол-во агентов: в заголовке числа нет → считаем li.item в data-key="Agent".
    function getValorantAgentCount() {
        const ul = document.querySelector('ul[data-key="Agent"]');
        return ul ? ul.querySelectorAll('li.item').length : 0;
    }

    function buildMarketUrl(basePath, extraParams) {
        const daybreak = getCurrentDaybreak();
        const parts = [].concat(extraParams);
        if (Number.isFinite(daybreak) && daybreak >= 0) parts.push('daybreak=' + encodeURIComponent(String(daybreak)));
        parts.push('order_by=price_to_up');
        return 'https://lzt.market/' + basePath + '?' + parts.join('&');
    }
    function buildRiotMarketUrl(itemId, itemType) {
        if (!itemId) return '';
        const paramKey = itemType === 'Buddy' ? 'buddy[]' : 'weaponSkin[]';
        const region = getCurrentRiotRegionCode();
        const extra = [paramKey + '=' + encodeURIComponent(itemId)];
        if (region) extra.push('valorant_region[]=' + encodeURIComponent(region));
        return buildMarketUrl('riot', extra);
    }
    const buildSteamGameMarketUrl = gameId => gameId
        ? buildMarketUrl('steam/', ['game[]=' + encodeURIComponent(String(gameId))])
        : '';
    function buildFortniteMarketUrl(itemId, dataKey) {
        if (!itemId) return '';
        const paramKey = getFortnitePriceParamKey(itemId, dataKey);
        const normalizedItemId = paramKey === 'skin[]' ? String(itemId).replace(/^cid_/i, '') : String(itemId);
        return buildMarketUrl('fortnite/', [paramKey + '=' + encodeURIComponent(normalizedItemId)]);
    }

    function getFortnitePriceParamKey(itemId, dataKey) {
        const keyMap = {
            fortnite_skins: 'skin[]',
            fortnite_skin: 'skin[]',
            skins: 'skin[]',
            fortnite_pickaxe: 'pickaxe[]',
            fortnite_pickaxes: 'pickaxe[]',
            pickaxe: 'pickaxe[]',
            pickaxes: 'pickaxe[]',
            fortnite_dance: 'dance[]',
            fortnite_dances: 'dance[]',
            dance: 'dance[]',
            dances: 'dance[]',
            fortnite_glider: 'glider[]',
            fortnite_gliders: 'glider[]',
            glider: 'glider[]',
            gliders: 'glider[]'
        };
        const key = keyMap[String(dataKey || '').toLowerCase()];
        if (key) return key;
        const id = String(itemId || '').toLowerCase();
        if (id.startsWith('pickaxe_') || id.startsWith('pickaxe:')) return 'pickaxe[]';
        if (id.startsWith('eid_') || id.startsWith('emote_') || id.startsWith('dance_')) return 'dance[]';
        if (id.startsWith('glider_')) return 'glider[]';
        return 'skin[]';
    }

    function buildPriceSearchRequest(meta) {
        if (!meta || !meta.kind) return null;
        const daybreak = getCurrentDaybreak();
        if (meta.kind === 'riot-skin' || meta.kind === 'riot-buddy') {
            const query = { order_by: 'price_to_up' };
            if (Number.isFinite(daybreak) && daybreak >= 0) query.daybreak = daybreak;
            const region = getCurrentRiotRegionCode();
            if (region) query['valorant_region[]'] = [region];
            query[meta.kind === 'riot-buddy' ? 'buddy[]' : 'weaponSkin[]'] = [meta.itemId];
            return { path: '/riot', query };
        }
        if (meta.kind === 'lol-title') {
            const query = { order_by: 'price_to_up', title: meta.name };
            if (Number.isFinite(daybreak) && daybreak >= 0) query.daybreak = daybreak;
            return { path: '/riot', query };
        }
        if (meta.kind === 'steam-game') {
            const query = { order_by: 'price_to_up', 'game[]': [meta.itemId] };
            if (Number.isFinite(daybreak) && daybreak >= 0) query.daybreak = daybreak;
            return { path: '/steam', query };
        }
        if (meta.kind === 'fortnite-item') {
            const query = { order_by: 'price_to_up' };
            if (Number.isFinite(daybreak) && daybreak >= 0) query.daybreak = daybreak;
            const key = getFortnitePriceParamKey(meta.itemId, meta.dataKey);
            query[key] = [key === 'skin[]' ? String(meta.itemId).replace(/^cid_/i, '') : meta.itemId];
            return { path: '/fortnite', query };
        }
        return null;
    }

    async function fetchItemPriceStats(meta) {
        const req = buildPriceSearchRequest(meta);
        if (!req) throw new Error('No API search mapping for this item');
        const data = await apiFetch(req.path, { query: req.query, tokenFeature: 'Парс цен редких предметов' });
        const items = Array.isArray(data && data.items) ? data.items : [];
        const validItems = items.filter(item => {
            const price = Number(item && item.price || 0);
            return Number.isFinite(price) && price > 0 && price < 99999;
        });
        const prices = validItems.map(item => Number(item.price || 0));
        return {
            count: validItems.length,
            min: prices.length ? Math.min.apply(null, prices) : 0,
            avg: prices.length ? average(prices) : 0,
            currency: validItems[0] && validItems[0].price_currency ? validItems[0].price_currency : ((items[0] && items[0].price_currency) ? items[0].price_currency : '')
        };
    }

    function renderPricePlate(hostCard, state, payload) {
        const plate = ensurePricePlate(hostCard);
        const theme = buildRareActionTheme();
        plate.style.setProperty('background', theme.surfaceBg);
        plate.style.setProperty('border-color', theme.surfaceBorder);
        plate.style.setProperty('box-shadow', theme.surfaceShadow);
        plate.style.setProperty('--rare-price-accent-rgb', theme.tintRgb);
        plate.textContent = '';
        hostCard.classList.add('rarePriceEnabled');

        if (state === 'loading') {
            const msg = createNode('div', 'rarePricePlateMsg');
            const spin = createNode('span', 'rarePriceSpin');
            msg.appendChild(spin);
            msg.appendChild(document.createTextNode(payload ? 'Обновляю цены…' : 'Загрузка цен…'));
            plate.appendChild(msg);
            if (!hostCard.__rarePricePlateVisible) placePricePlate(hostCard, plate);
            return;
        }
        if (state === 'error') {
            plate.appendChild(createNode('div', 'rarePricePlateMsg is-error', payload || 'Не удалось загрузить цены'));
            if (!hostCard.__rarePricePlateVisible) placePricePlate(hostCard, plate);
            return;
        }

        const saved = payload || {};
        const stats = saved.stats || {};
        const meta = saved.meta || hostCard.__rarePriceMeta || null;
        const cur = stats.currency || '';
        const isSkinPrice = !(meta && meta.kind === 'steam-game');
        const head = createNode('div', 'rarePricePlateHead');
        head.innerHTML = '<span class="rarePricePlateHeadIcon">' + priceTagSvg() + '</span><span>' + (isSkinPrice ? 'Цена скина' : 'Цена игры') + '</span>';
        plate.appendChild(head);

        const body = createNode('div', 'rarePricePlateBody');
        [
            ['мин', stats.count ? formatPricePlateMoney(stats.min, cur) : '—'],
            ['сред', stats.count ? formatPricePlateMoney(stats.avg, cur) : '—'],
            ['всего аккаунтов', String(stats.count || 0)]
        ].forEach(([label, value]) => {
            const row = createNode('div', 'rarePricePlateRow');
            row.appendChild(createNode('span', 'rarePricePlateKey', label));
            row.appendChild(createNode('span', 'rarePricePlateValue' + (label === 'всего аккаунтов' ? '' : ' is-price'), value));
            body.appendChild(row);
        });
        const daybreakWarning = getPricePlateDaybreakWarning();
        if (daybreakWarning) {
            const warn = createNode('div', 'rarePricePlateWarning');
            warn.innerHTML = '<span class="rarePricePlateWarningIcon">[!]</span>' + escHtml(daybreakWarning);
            body.appendChild(warn);
        }
        // Аккаунтов на маркете не нашлось: цена неизвестна. Предлагаем понизить отлегу.
        if (!stats.count) {
            const noAcc = createNode('div', 'rarePricePlateNoAcc');
            noAcc.appendChild(createNode('span', '', 'Аккаунтов с такими параметрами на маркете не найдено — цену определить не удалось. Понизьте отлегу на маркете, чтобы узнать примерную цену. Воспользуйтесь кнопкой внешней ссылки ниже.'));
            body.appendChild(noAcc);
        }
        if (saved.errorText) body.appendChild(createNode('div', 'rarePricePlateErrorText', saved.errorText));
        plate.appendChild(body);

        const foot = createNode('div', 'rarePricePlateFoot');
        const priceAgeMs = Date.now() - Number(saved.savedAt || 0);
        if (!saved.refreshing && priceAgeMs >= 24 * 60 * 60 * 1000) foot.classList.add('is-danger');
        else if (!saved.refreshing && priceAgeMs >= 12 * 60 * 60 * 1000) foot.classList.add('is-warn');
        const ageWarning = foot.classList.contains('is-warn') || foot.classList.contains('is-danger');
        foot.innerHTML = '<span class="rarePricePlateFootIcon">' + clockSvg() + '</span><span class="rarePricePlateFootText">' + (ageWarning ? '⚠︎ ' : '') + (saved.refreshing ? 'Обновляю…' : priceAgeLabel(saved.savedAt)) + '</span>';
        plate.appendChild(foot);
        placePricePlate(hostCard, plate);
    }

    async function showPriceStats(card, meta, anchorEl) {
        const hostCard = (anchorEl && anchorEl.closest && anchorEl.closest('.rareHoverGlow')) || card;
        if (!hostCard) return;
        const cached = getCachedItemPrice(meta);
        if (!hasApiToken() && !cached) {
            showPersistentApiTokenToast('Парс цен редких предметов', false);
            return;
        }
        showPriceHintToast();
        hostCard.__rarePricePlatePinned = true;
        renderPricePlate(hostCard, 'loading');
        showPricePlate(hostCard);

        if (cached) {
            const previousErrorText = hostCard.__rarePriceStats && hostCard.__rarePriceStats.errorText;
            hostCard.__rarePriceStats = { meta, stats: cached.stats, savedAt: cached.savedAt, errorText: previousErrorText || cached.errorText || '' };
            renderPricePlate(hostCard, 'ready', hostCard.__rarePriceStats);
        }

        if (!hasApiToken()) {
            if (!cached) hidePricePlate(hostCard);
            hostCard.__rarePricePlatePinned = false;
            return;
        }

        const reqId = (hostCard.__rarePriceReq || 0) + 1;
        hostCard.__rarePriceReq = reqId;
        if (cached) renderPricePlate(hostCard, 'ready', Object.assign({}, hostCard.__rarePriceStats, { refreshing: true }));
        else renderPricePlate(hostCard, 'loading');
        try {
            const stats = await fetchItemPriceStats(meta);
            saveCachedItemPrice(meta, stats);
            hostCard.__rarePriceStats = { meta, stats, savedAt: Date.now() };
            if (hostCard.__rarePriceReq !== reqId) return;
            renderPricePlate(hostCard, 'ready', hostCard.__rarePriceStats);
            hostCard.__rarePricePlatePinned = false;
        } catch (e) {
            logScriptError('price stats failed', e, meta);
            if (hostCard.__rarePriceReq !== reqId) return;
            const isInvalidToken = /invalid or expired access token/i.test(e && e.message || '');
            const priceErrorText = isInvalidToken ? 'API токен недействителен или истёк. Обнови токен в настройках.' : 'Ошибка парса цены редкого предмета. Попробуй обновить позже.';
            if (!isInvalidToken) showUiError(createError(priceErrorText), priceErrorText, 'price:' + priceCacheKeyFor(meta));
            if (cached) {
                hostCard.__rarePriceStats = Object.assign({}, hostCard.__rarePriceStats, { refreshing: false, errorText: priceErrorText });
                saveCachedItemPriceError(meta, priceErrorText);
                renderPricePlate(hostCard, 'ready', hostCard.__rarePriceStats);
            }
            else renderPricePlate(hostCard, 'error', priceErrorText);
            hostCard.__rarePricePlatePinned = false;
        }
    }

    function updateLastActivityDays(force) {
        const roots = getActivityRoots();
        roots.forEach(root => {
            const counter = findLastActivityCounter(root);
            if (!counter) return;
            if (!force && counter.dataset.ladDone === '1') return;
            const label = counter.querySelector('.label');
            const muted = counter.querySelector('.muted');
            if (label) label.style.removeProperty('color');
            ['display', 'grid-template-columns', 'align-items', 'column-gap'].forEach(p => counter.style.removeProperty(p));
            if (label) ['grid-column', 'grid-row'].forEach(p => label.style.removeProperty(p));
            if (muted) ['grid-column', 'grid-row'].forEach(p => muted.style.removeProperty(p));
            const existingSpan = counter.querySelector('.lastActivityDays');

            const days = parseActivityDays(counter);
            if (days === null) {
                if (existingSpan) existingSpan.remove();
                if (label && isWeekdayOnlyActivity(counter)) {
                    label.style.setProperty('color', '#e25555', 'important');
                    counter.dataset.ladDone = '1';
                }
                return;
            }

            const anchor = counter.querySelector('abbr.DateTime[data-time], abbr[data-time], time[data-timestamp], time[datetime]');
            if (!anchor && !label) return;

            let span = counter.querySelector('.lastActivityDays');
            if (!span) {
                span = createNode('span', 'lastActivityDays');
                if (anchor) {
                    span.style.marginLeft = '6px';
                    anchor.parentNode.insertBefore(span, anchor.nextSibling);
                } else {
                    span.style.marginLeft = '10px';
                    label.parentNode.insertBefore(span, label.nextSibling);
                }
            }
            span.style.removeProperty('float');
            ['grid-column', 'grid-row', 'align-self', 'justify-self', 'margin-left'].forEach(p => span.style.removeProperty(p));

            span.textContent = '(' + days + ' ' + pluralDays(days) + ')';
            const lvl = levelForDays(days);
            applyLevelStyle(span, lvl.color, lvl.effect);
            if (anchor) span.style.setProperty('margin-left', '6px', 'important');
            if (!anchor && label && muted) {
                [['display', 'grid'], ['grid-template-columns', 'minmax(0,1fr) auto'], ['align-items', 'start'], ['column-gap', '10px']]
                    .forEach(([p, v]) => counter.style.setProperty(p, v, 'important'));
                label.style.setProperty('grid-column', '1', 'important');
                label.style.setProperty('grid-row', '1', 'important');
                muted.style.setProperty('grid-column', '1', 'important');
                muted.style.setProperty('grid-row', '2', 'important');
                span.style.setProperty('grid-column', '2', 'important');
                span.style.setProperty('grid-row', '1 / 3', 'important');
                span.style.setProperty('align-self', 'start', 'important');
                span.style.setProperty('justify-self', 'end', 'important');
                span.style.setProperty('margin-left', '10px', 'important');
            }
            counter.dataset.ladDone = '1';
        });
    }

    function restoreOriginal(li) {
        li.classList.remove('rareItem');
        li.classList.remove('rareFortniteItem');
        delete li.dataset.rareMoved;
        li.style.removeProperty('border-color');
        li.style.removeProperty('--rare-color');
        li.style.removeProperty('display');
    }

    function restoreWrappers() {
        const lists = document.querySelectorAll(
            'ul[data-key="WeaponSkins"], ul[data-key="Buddy"], .fortniteItems ul.body, .marketItemView--gamesContainer.fortniteItems ul, ul.body[data-save-url]'
        );
        lists.forEach(ul => {
            let node = ul;
            while (node && node !== document.body) {
                const cl = node.classList;
                if (cl && (cl.contains('mn-0-0-45') || cl.contains('scroll-wrapper') ||
                           cl.contains('scroll-content') || cl.contains('marketItemView--gamesContainer'))) {
                    node.style.removeProperty('height');
                    node.style.removeProperty('max-height');
                    node.style.removeProperty('overflow');
                }
                if (cl && cl.contains('mn-0-0-45')) break;
                node = node.parentElement;
            }
        });
        document.querySelectorAll('[id^="rareHead_"]').forEach(el => el.remove());
        document.querySelectorAll('[id^="rareWrap_"]').forEach(el => el.remove());
    }

    function attachPanelColorPalette(gear) {
        if (!gear || gear._rarePanelPaletteBound) return;
        gear._rarePanelPaletteBound = true;
        const palette = createNode('span', 'rareSkinsGearPalette');
        let hidePaletteTimer = 0;
        const syncActive = () => {
            const activeColor = (CUSTOM.panelColor || DEFAULT_CUSTOM.panelColor).toLowerCase();
            palette.querySelectorAll('.rareSkinsGearColor').forEach(btn => {
                btn.classList.toggle('active', (btn.dataset.color || '').toLowerCase() === activeColor);
            });
        };
        const positionPalette = () => {
            const gearRect = gear.getBoundingClientRect();
            const paletteRect = palette.getBoundingClientRect();
            const top = Math.max(8, Math.min(window.innerHeight - paletteRect.height - 8, gearRect.top + (gearRect.height - paletteRect.height) / 2));
            const left = Math.max(8, gearRect.left - paletteRect.width - 10);
            palette.style.top = top + 'px';
            palette.style.left = left + 'px';
        };
        const showPalette = () => {
            clearTimeout(hidePaletteTimer);
            syncActive();
            positionPalette();
            palette.classList.add('show');
        };
        const hidePalette = () => {
            clearTimeout(hidePaletteTimer);
            hidePaletteTimer = setTimeout(() => palette.classList.remove('show'), 120);
        };
        MENU_PALETTE.forEach(color => {
            const swatch = createNode('button', 'rareSkinsGearColor');
            swatch.type = 'button';
            swatch.dataset.color = color;
            swatch.style.setProperty('--rare-gear-color', color);
            swatch.title = color;
            swatch.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                CUSTOM.panelColor = color;
                saveCustom(CUSTOM);
                applyCustom();
                syncActive();
            });
            palette.appendChild(swatch);
        });
        palette.addEventListener('mouseenter', () => clearTimeout(hidePaletteTimer));
        palette.addEventListener('mouseleave', hidePalette);
        gear.addEventListener('mouseenter', showPalette);
        gear.addEventListener('mouseleave', hidePalette);
        gear.addEventListener('focusin', showPalette);
        gear.addEventListener('focusout', hidePalette);
        document.body.appendChild(palette);
        syncActive();
    }

    function attachThemeGearHover(gear) {
        if (!gear || gear._rareThemeHoverBound) return;
        gear._rareThemeHoverBound = true;
        const applyIdle = () => {
            gear.style.background = 'transparent';
            gear.style.borderColor = 'transparent';
            gear.style.boxShadow = 'none';
            gear.style.color = '#8c8c8c';
        };
        const applyActive = () => {
            const panelColor = CUSTOM.panelColor || DEFAULT_CUSTOM.panelColor;
            const panelRgb = hexToRgbList(panelColor);
            gear.style.background = 'rgba(' + panelRgb + ',0.10)';
            gear.style.borderColor = 'rgba(' + panelRgb + ',0.24)';
            gear.style.boxShadow = 'none';
            gear.style.color = panelColor;
        };
        gear.addEventListener('mouseenter', applyActive);
        gear.addEventListener('mouseleave', applyIdle);
        gear.addEventListener('focusin', applyActive);
        gear.addEventListener('focusout', applyIdle);
        applyIdle();
    }

    function otherTitleText(base, itemName, pronoun) {
        return base + ' (Наведите на ' + itemName + ' чтобы добавить ' + (pronoun || 'его') + ' в редкие)';
    }

    function setOtherTitleBefore(anchorEl, id, base, itemName, pronoun, visible) {
        let title = document.getElementById(id);
        if (!title) {
            title = document.createElement('div');
            title.id = id;
            title.className = 'rareOtherTitle rareSteamAllTitle';
            const parent = anchorEl && anchorEl.parentNode;
            if (parent) parent.insertBefore(title, anchorEl);
        }
        title.textContent = otherTitleText(base, itemName, pronoun);
        title.style.display = visible ? 'block' : 'none';
        return title;
    }

    function addClone(grid, li, color, cat, effect) {
        const clone = li.cloneNode(true);
        clone.classList.add('rareItem');
        clone.classList.add('rareHoverGlow');
        if (cat && cat.game === 'fortnite') clone.classList.add('rareFortniteItem');
        clone.removeAttribute('data-rare-moved');
        clone.style.setProperty('border-color', color, 'important');
        clone.style.setProperty('--rare-color', color);
        clone.style.removeProperty('display');
        applyRareItemEffect(clone, color, effect || 'none', cat && cat.game === 'fortnite');
        const externalHref = cat && cat.game === 'valorant'
            ? buildRiotMarketUrl(li.getAttribute('data-id') || clone.getAttribute('data-id') || '', cat.key)
            : '';
        const priceMeta = cat && cat.game === 'lol'
            ? { kind: 'lol-title', name: getItemName(li) }
            : {
                kind: cat && cat.key === 'buddies' ? 'riot-buddy' : 'riot-skin',
                itemId: li.getAttribute('data-id') || clone.getAttribute('data-id') || '',
                name: getItemName(li)
            };
        attachPriceHoverMenu(clone, externalHref, priceMeta);
        grid.appendChild(clone);
    }

    function collectMatchesFromList(ul, cat) {
        const matches = [];
        if (!ul) return matches;
        ul.querySelectorAll('li.item').forEach(li => {
            const name = getItemName(li);
            const w = matchWanted(name, cat);
            restoreOriginal(li);
            if (w) matches.push({ li, color: w.color, effect: w.effect || 'none', cat });
        });
        return matches;
    }

    function collectRiotLolCardMatches(cat) {
        const found = [];
        const seen = new Set();
        findLolSkinLists().forEach(ul => {
            collectMatchesFromList(ul, cat).forEach(match => {
                const name = cleanAutoTitleSkinName(getItemName(match.li));
                const key = norm(name);
                if (!key || seen.has(key)) return;
                seen.add(key);
                found.push({ li: match.li, name, color: match.color, effect: match.effect || 'none', cat });
            });
        });
        return found;
    }

    // ─── общий каркас панели ──────────────────────────────────────────────────

    /**
     * Создаёт панель при первом вызове или возвращает существующую.
     * @param {object} opts
     * @param {string}   opts.panelId        — id элемента
     * @param {string}   opts.gearTitle      — title шестерёнки
     * @param {Function} opts.onGearClick     — обработчик клика по шестерёнке
     * @param {string}   opts.bodyClass      — класс контейнера контента внутри панели
     * @param {string}   [opts.extraHeaderHtml] — дополнительный HTML в хедер (до шестерёнки)
     * @param {Element}  opts.insertBefore   — DOM-узел, перед которым вставляется панель
     * @param {Element}  [opts.insertParent] — родитель для вставки (по умолчанию insertBefore.parentNode)
     * @returns {{ panel: Element, body: Element, isNew: boolean }}
     */
    function ensurePanel(opts) {
        const existing = document.getElementById(opts.panelId);
        if (existing) {
            return { panel: existing, body: existing.querySelector('.' + opts.bodyClass.split(' ')[0]), isNew: false };
        }
        const panel = document.createElement('div');
        panel.id = opts.panelId;
        panel.className = 'rarePanel rareSteamPanel';
        panel.innerHTML =
            '<div class="rarePanelHead rareSteamPanelHead">' +
                '<span class="rarePanelTitle rareSteamPanelTitle"></span>' +
                (opts.extraHeaderHtml || '') +
                '<span class="rareSteamGear" title="' + (opts.gearTitle || '') + '">' + gearSvg() + '</span>' +
            '</div>' +
            '<div class="' + opts.bodyClass + '"></div>';
        const gear = panel.querySelector('.rareSteamGear');
        attachPanelColorPalette(gear);
        attachThemeGearHover(gear);
        gear.addEventListener('click', opts.onGearClick);
        const parent = opts.insertParent || opts.insertBefore.parentNode;
        parent.insertBefore(panel, opts.insertBefore);
        return { panel, body: panel.querySelector('.' + opts.bodyClass.split(' ')[0]), isNew: true };
    }

    /**
     * Финализирует панель: обновляет заголовок, видимость, «другие» заголовок.
     */
    function finalizePanel(panel, contentEl, total, titleText, otherArgs) {
        setRarePanelHeaderOnlyState(panel, contentEl, !total);
        setRarePanelTitle(panel, titleText);
        panel.style.display = 'block';
        if (otherArgs) setOtherTitleBefore(...otherArgs);
    }

    // ─── общие примитивы категорий ───────────────────────────────────────────
    const DEFAULT_CARD_FX = { borderGlowAlpha: 0.45, outerGlowAlpha: 0.22, outerShimmerAlpha: 0.22 };
    const resolveScrollWrapper = ul => ul.closest('.scroll-wrapper') || ul.closest('.mn-0-0-45') || ul.closest('.marketItemView--gamesContainer') || ul.parentNode;
    // total + падеж или "нет редких" — единый заголовок для finalizePanel
    const countLabel = (total, pluralFn, suffix) => total ? (total + ' ' + pluralFn(total) + (suffix || '')) : NO_RARE_ITEMS_TEXT;
    // редкая карточка-сетка (fortnite/mihoyo/tanks): div.rareCompactCard + FX + innerHtml
    function createCompactCard(color, effect, extraClass, innerHtml) {
        const card = createNode('div', 'rareCompactCard rareFortniteCard rareHoverGlow' + (extraClass ? ' ' + extraClass : ''));
        card.style.setProperty('--rare-color', color);
        applyCardEffect(card, color, effect, { shimmerHost: card, ...DEFAULT_CARD_FX });
        if (innerHtml) card.innerHTML = innerHtml;
        return card;
    }
    // hover-меню с ценой (fortnite/steam-game)
    const attachPriceHoverMenu = (card, href, priceMeta) => appendHoverMenu(card, {
        externalHref: href, priceTitle: 'Показать min / avg цену', priceMeta,
        onPriceClick: (_, btn) => showPriceStats(card, priceMeta, btn)
    });
    // сбор совпадений: перебор li по селектору, extract(li)->{name,extra} | null
    function collectWantedMatches(lists, cat, selector, extract) {
        const matches = [];
        lists.forEach(ul => ul.querySelectorAll(selector).forEach(li => {
            const data = extract(li, ul);
            if (!data) return;
            const w = data.name ? matchWanted(data.name, cat) : null;
            if (data.after) data.after(li, w);
            if (!w) return;
            matches.push({ name: data.name, color: w.color, effect: w.effect || 'none', li, w, ...(data.extra || {}) });
        }));
        return matches;
    }

    // ─── game-специфичные buildCategory ──────────────────────────────────────

    const SCROLL_CLASS_RE = /\bscroll-content\b|\bscroll-scrolly_visible\b|\bMarketScrollBar\b|\bscrollbar-macosx\b|\bscrollbar-dynamic\b/g;
    function getRiotGamesClass(ul, fallback) {
        const c = ul && ul.closest('.marketItemView--gamesContainer');
        return c ? c.className.replace(SCROLL_CLASS_RE, '').trim() : fallback;
    }
    function buildRiotSection(sections, matches, wrapClass, gridClass, logoSvg, afterClone) {
        if (!matches.length) return;
        const wrap = createNode('div', 'rareRiotGames ' + wrapClass);
        wrap.style.cssText = 'max-height:none!important;height:auto!important;overflow:visible!important;';
        const grid = createNode('ul', gridClass);
        matches.forEach(m => {
            addClone(grid, m.li, m.color, m.cat, m.effect);
            if (afterClone) afterClone(grid.lastElementChild);
        });
        wrap.appendChild(grid);
        const section = createNode('div');
        section.innerHTML = '<div class="rareMihoyoSectionTitle"><span class="rareSectionLogo">' + logoSvg() + '</span></div>';
        section.appendChild(wrap);
        sections.appendChild(section);
    }

    function buildValorantCombined() {
        const skinsUl = document.querySelector('ul[data-key="' + CATEGORIES.skins.key + '"]');
        const buddiesUl = document.querySelector('ul[data-key="' + CATEGORIES.buddies.key + '"]');
        const lolMatches = orderMatchesByWanted(collectRiotLolCardMatches(CATEGORIES.lol), CATEGORIES.lol, m => m.name);
        if (!skinsUl && !buddiesUl && !lolMatches.length) return;

        const anchorUl = skinsUl || buddiesUl || findLolSkinLists()[0];
        const anchor = anchorUl
            ? (anchorUl.closest('.mn-0-0-45') || anchorUl.closest('.marketItemView--gamesContainer') || anchorUl.parentNode)
            : document.querySelector('.marketItemView--ParsedInfo');
        const scrollWrapper = (anchor.parentNode && anchor.parentNode.classList && anchor.parentNode.classList.contains('scroll-wrapper'))
            ? anchor.parentNode : anchor;

        // Иконка «+» на каждом source-элементе (скины/брелки Valorant, скины LoL).
        if (skinsUl) skinsUl.querySelectorAll('li.item').forEach(li => attachSourceAddButton(li, CATEGORIES.skins, getItemName));
        if (buddiesUl) buddiesUl.querySelectorAll('li.item').forEach(li => attachSourceAddButton(li, CATEGORIES.buddies, getItemName));
        findLolSkinLists().forEach(ul => ul.querySelectorAll('li.item').forEach(li => attachSourceAddButton(li, CATEGORIES.lol, li2 => cleanAutoTitleSkinName(getItemName(li2)))));

        const valMatches = [];
        if (skinsUl) valMatches.push.apply(valMatches, orderMatchesByWanted(collectMatchesFromList(skinsUl, CATEGORIES.skins), CATEGORIES.skins, m => getItemName(m.li)));
        if (buddiesUl) valMatches.push.apply(valMatches, orderMatchesByWanted(collectMatchesFromList(buddiesUl, CATEGORIES.buddies), CATEGORIES.buddies, m => getItemName(m.li)));
        const total = valMatches.length + lolMatches.length;

        const { panel } = ensurePanel({
            panelId: 'rareValorantPanel',
            gearTitle: 'Настройки редких предметов Riot Games',
            onGearClick: () => openSettings(CATEGORIES.skins),
            bodyClass: 'rareMihoyoSections rareRiotSections',
            insertBefore: scrollWrapper
        });
        const sections = panel.querySelector('.rareRiotSections');
        sections.innerHTML = '';

        buildRiotSection(sections, valMatches,
            getRiotGamesClass(anchorUl, 'valorantItems marketItemView--gamesContainer'),
            anchorUl ? (anchorUl.className || 'body') : 'body',
            valorantPlayLogoSvg, null);

        const lolUl = lolMatches.length ? findLolSkinLists()[0] : null;
        buildRiotSection(sections, lolMatches,
            'rareLolGames ' + getRiotGamesClass(lolUl, 'marketItemView--gamesContainer lolItems'),
            lolUl ? (lolUl.className || 'body') : 'body',
            leagueLogoSvg, el => el && el.classList.add('rareLolItem'));

        finalizePanel(panel, sections, total,
            countLabel(total, pluralRareItems),
            [scrollWrapper, 'rareOther_ValorantRare', 'Все предметы', 'предмет', 'его', !!total]
        );
    }

    function findFortniteLists() {
        const lists = [];
        document.querySelectorAll('.fortniteItems ul.body, .marketItemView--gamesContainer.fortniteItems ul').forEach(ul => {
            if (!ul.closest('.rareBucket')) lists.push(ul);
        });
        if (!lists.length) {
            const re = /скин|кирк|танц|дельтаплан|эмоц|glider|pickaxe/i;
            document.querySelectorAll('h4').forEach(h4 => {
                if (!re.test(h4.textContent || '')) return;
                let sib = h4.nextElementSibling;
                while (sib && !sib.querySelector) sib = sib.nextElementSibling;
                if (sib) { const ul = sib.matches('ul') ? sib : sib.querySelector('ul'); if (ul) lists.push(ul); }
            });
        }
        return lists;
    }

    function findHeadingBefore(anchor) {
        let node = anchor;
        while (node) {
            let sib = node.previousElementSibling;
            while (sib) {
                if (sib.tagName === 'H4') return sib;
                const inner = sib.querySelector && sib.querySelector('h4');
                if (inner) return inner;
                sib = sib.previousElementSibling;
            }
            node = node.parentElement;
            if (node && node.classList && node.classList.contains('mn-0-0-45')) {
                const h = node.querySelector('h4');
                if (h) return h;
            }
            if (!node || node === document.body) break;
        }
        return null;
    }

    // Добавляет имя в wanted-список произвольной категории (для иконки «+»).
    function addWantedNameToCat(cat, name) {
        if (!cat) return false;
        const cleanName = String(name || '').trim();
        if (!cleanName) return false;
        const wanted = Array.isArray(cat.wanted) ? cat.wanted : (cat.wanted = []);
        if (wanted.some(x => norm(x && x.name) === norm(cleanName))) return false;
        wanted.push({ name: cleanName, color: cat.defaultColor, effect: 'none' });
        saveWanted(cat, wanted);
        return true;
    }
    // Совместимость.
    function addFortniteWantedName(name) { return addWantedNameToCat(CATEGORIES.fortnite, name); }

    function setRarePanelHeaderOnlyState(panel, content, isEmpty) {
        if (!panel) return;
        const head = panel.querySelector('.rarePanelHead, .rareSteamPanelHead');
        if (content) content.style.display = isEmpty ? 'none' : '';
        if (head) head.style.marginBottom = isEmpty ? '0' : '';
        if (isEmpty) {
            const panelBg = panelBgPresetCss('#737373');
            panel.style.setProperty('--rare-panel-color', '#737373');
            panel.style.setProperty('--rare-panel-bg', panelBg.bgColor);
            panel.style.setProperty('--rare-panel-bg-image', panelBg.bgImage);
            return;
        }
        panel.style.removeProperty('--rare-panel-color');
        panel.style.removeProperty('--rare-panel-bg');
        panel.style.removeProperty('--rare-panel-bg-image');
    }

    function setRarePanelTitle(panel, text) {
        const title = panel && panel.querySelector('.rarePanelTitle, .rareSteamPanelTitle');
        if (title) title.textContent = text;
    }

    // ─── Универсальная иконка «+» (добавить в поиск) для любой категории ──────
    // Один общий плавающий singleton-элемент (position:fixed), который следует
    // за наведённым source-item. Каждый item хранит в dataset ключ категории и
    // способ извлечь имя. Ничего не перекрывает (z-index max), при скролле/resize
    // пересчитывает координаты в системе viewport, поэтому не «улетает».
    let srcAddMenu = null;
    let srcAddTarget = null;         // наведённый source-элемент
    let srcAddTargetCat = null;      // CATEGORIES-объект для этого элемента
    let srcAddTargetName = null;     // функция извлечения имени (li) => string
    let srcAddHideTimer = 0;
    let srcAddSyncScheduled = false;
    let srcAddWatchersReady = false;

    function syncSourceAddButtonPosition() {
        srcAddSyncScheduled = false;
        if (!srcAddMenu || !srcAddTarget || !srcAddMenu.classList.contains('show')) return;
        if (!document.body.contains(srcAddTarget)) { hideSourceAddButton(); return; }
        const img = srcAddTarget.querySelector('img');
        const targetRect = img ? img.getBoundingClientRect() : srcAddTarget.getBoundingClientRect();
        if (!targetRect || targetRect.width <= 0 || targetRect.height <= 0 || targetRect.bottom < 0 || targetRect.top > window.innerHeight) {
            hideSourceAddButton();
            return;
        }
        srcAddMenu.style.left = Math.round(targetRect.left + targetRect.width / 2) + 'px';
        srcAddMenu.style.top = Math.round(targetRect.top) + 'px';
    }

    function scheduleSourceAddButtonSync() {
        if (srcAddSyncScheduled) return;
        srcAddSyncScheduled = true;
        requestAnimationFrame(syncSourceAddButtonPosition);
    }

    function ensureSourceAddWatchers() {
        if (srcAddWatchersReady) return;
        srcAddWatchersReady = true;
        window.addEventListener('scroll', scheduleSourceAddButtonSync, true);
        window.addEventListener('resize', scheduleSourceAddButtonSync, true);
    }

    function ensureSourceAddMenu() {
        if (srcAddMenu && srcAddMenu.isConnected) return srcAddMenu;
        ensureSourceAddWatchers();
        const menu = createNode('div', 'rareFortniteSourceAddMenu');
        const btn = createNode('button', 'rareHoverMenuBtn rareFortniteSourceAddBtn');
        btn.type = 'button';
        btn.title = 'Добавить в поиск';
        btn.innerHTML = plusSvg();
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!srcAddTarget || !srcAddTargetCat) return;
            const raw = srcAddTargetName ? srcAddTargetName(srcAddTarget) : getItemName(srcAddTarget);
            const name = String(raw || '').trim();
            if (!name) return;
            const added = addWantedNameToCat(srcAddTargetCat, name);
            showThemeToast(added ? ('Добавлено: ' + cleanAutoTitleSkinName(name)) : 'Уже есть в поиске');
            if (added) rebuild();
        });
        menu.appendChild(btn);
        applyThemeHoverMenu(menu);
        menu.addEventListener('mouseenter', () => {
            if (srcAddHideTimer) { clearTimeout(srcAddHideTimer); srcAddHideTimer = 0; }
            menu.classList.add('show');
        });
        menu.addEventListener('mouseleave', () => hideSourceAddButton());
        document.body.appendChild(menu);
        srcAddMenu = menu;
        return menu;
    }

    function placeSourceAddButton(li) {
        if (li) srcAddTarget = li;
        ensureSourceAddMenu();
        syncSourceAddButtonPosition();
    }

    function showSourceAddButton(li, cat, nameFn) {
        if (!li) return;
        if (srcAddHideTimer) { clearTimeout(srcAddHideTimer); srcAddHideTimer = 0; }
        srcAddTarget = li;
        srcAddTargetCat = cat || null;
        srcAddTargetName = nameFn || null;
        const menu = ensureSourceAddMenu();
        placeSourceAddButton(li);
        menu.classList.add('show');
    }

    function hideSourceAddButton(li) {
        if (li && srcAddTarget && li !== srcAddTarget) return;
        if (!srcAddMenu) return;
        if (srcAddHideTimer) clearTimeout(srcAddHideTimer);
        srcAddHideTimer = setTimeout(() => {
            if (!srcAddMenu) return;
            srcAddMenu.classList.remove('show');
            srcAddTarget = null;
            srcAddTargetCat = null;
            srcAddTargetName = null;
            srcAddHideTimer = 0;
        }, 120);
    }

    // Универсальная привязка иконки «+» к source-элементу.
    // cat — CATEGORIES-объект (куда добавлять), nameFn(li)->string — извлечение имени.
    function attachSourceAddButton(li, cat, nameFn) {
        if (!li || li.closest('.rareBucket') || li.dataset.rareSourceAddReady === '1') return;
        li.dataset.rareSourceAddReady = '1';
        li.addEventListener('mouseenter', () => showSourceAddButton(li, cat, nameFn));
        li.addEventListener('mousemove', () => placeSourceAddButton(li));
        li.addEventListener('mouseleave', () => hideSourceAddButton(li));
    }

    // Совместимость со старым кодом Fortnite.
    function appendFortniteSourceAddButton(li) {
        attachSourceAddButton(li, CATEGORIES.fortnite, getItemName);
    }

    function buildFortniteCategory(cat) {
        const lists = findFortniteLists();
        if (!lists.length) return;

        lists.forEach(ul => ul.querySelectorAll('li.item').forEach(li => appendFortniteSourceAddButton(li)));

        const anchorUl = lists[0];
        const scrollWrapper = resolveScrollWrapper(anchorUl);

        const matches = orderMatchesByWanted(collectWantedMatches(lists, cat, 'li.item', (li, ul) => ({
            name: getItemName(li).trim(),
            extra: { id: li.getAttribute('data-id') || '', dataKey: ul.getAttribute('data-key') || '' }
        })), cat, m => m.name);

        const { panel } = ensurePanel({
            panelId: 'rareFortnitePanel',
            gearTitle: cat.gearTitle,
            onGearClick: () => openSettings(cat),
            bodyClass: 'rareCompactGrid rareFortniteGrid',
            insertBefore: scrollWrapper
        });

        const grid = panel.querySelector('.rareFortniteGrid');
        grid.innerHTML = '';
        matches.forEach(m => {
            const card = createCompactCard(m.color, m.effect);
            const imgWrap = createNode('div', 'rareCompactCardImg rareFortniteCardImg item ' + (m.li.className || '').replace(/\brareItem\b|\brareFortniteItem\b/g, '').trim());
            const srcImg = m.li.querySelector('img');
            const overrideImg = FORTNITE_CARD_IMAGE_OVERRIDES[norm(m.name)] || '';
            if (srcImg) {
                const clone = srcImg.cloneNode(true);
                if (overrideImg) { clone.src = overrideImg; clone.style.background = 'none'; }
                try {
                    const cs = getComputedStyle(srcImg);
                    ['background', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat'].forEach(p => {
                        const v = cs[p];
                        if (v && v !== 'none' && v !== 'rgba(0, 0, 0, 0)' && v !== 'transparent') { imgWrap.style[p] = v; clone.style[p] = v; }
                    });
                    const csLi = getComputedStyle(m.li);
                    ['background', 'backgroundColor', 'backgroundImage'].forEach(p => {
                        const v = csLi[p];
                        if (v && v !== 'none' && v !== 'rgba(0, 0, 0, 0)' && v !== 'transparent') imgWrap.style[p] = v;
                    });
                } catch (e) {}
                imgWrap.appendChild(clone);
            }
            card.appendChild(imgWrap);
            card.appendChild(createFortniteHoverName(m.name));
            card.appendChild(createRareCompactFrame());
            const priceMeta = { kind: 'fortnite-item', itemId: m.id, dataKey: m.dataKey, name: m.name };
            attachPriceHoverMenu(card, buildFortniteMarketUrl(m.id, m.dataKey), priceMeta);
            grid.appendChild(card);
        });

        finalizePanel(panel, grid, matches.length,
            countLabel(matches.length, pluralRareItems),
            [scrollWrapper, 'rareOther_' + cat.key, 'Все скины', 'скин', 'его', !!matches.length]
        );
    }

    const findMihoyoLists = () => Array.from(document.querySelectorAll('ul[data-key="genshin_characters"], ul[data-key="honkai_characters"], ul[data-key="zenless_characters"]'));

    function buildMihoyoCategory(cat) {
        const lists = findMihoyoLists();
        if (!lists.length) return;

        const anchorUl = lists[0];
        const scrollWrapper = anchorUl.closest('.scroll-wrapper') || anchorUl.parentNode;
        const parsedInfo = anchorUl.closest('.marketItemView--ParsedInfo');
        const header = parsedInfo && parsedInfo.querySelector('h4.mn-0-0-15');

        const groups = [
            { key: 'genshin_characters', title: 'Genshin Impact',    cat: CATEGORIES.genshin, items: [] },
            { key: 'honkai_characters',  title: 'Honkai: Star Rail', cat: CATEGORIES.honkai,  items: [] },
            { key: 'zenless_characters', title: 'Zenless Zone Zero', cat: CATEGORIES.zenless, items: [] }
        ];
        const groupMap = Object.fromEntries(groups.map(g => [g.key, g]));
        lists.forEach(ul => {
            const group = groupMap[ul.getAttribute('data-key') || ''];
            if (!group) return;
            // Иконка «+» на каждом персонаже (в свою игру: genshin/honkai/zenless).
            ul.querySelectorAll('li.item').forEach(li => attachSourceAddButton(li, group.cat,
                li2 => (li2.getAttribute('data-cachedtitle') || getItemName(li2) || '')));
            const mkExtra = li => ({
                name: (li.getAttribute('data-cachedtitle') || getItemName(li) || '').trim(),
                extra: {
                    img: (li.querySelector('img.avatar, img') || {}).src || '',
                    level: (li.querySelector('.level') ? li.querySelector('.level').textContent : '').trim(),
                    fate: (li.querySelector('.fate-level') ? li.querySelector('.fate-level').textContent : '').trim(),
                    rarityClass: (li.querySelector('.role-rarity-5, .role-rarity-4, .inner, .role-medium-pos, .rarity-icon img') || {}).className || '',
                    rarityImg: (li.querySelector('.rarity-icon img') || {}).getAttribute ? li.querySelector('.rarity-icon img').getAttribute('src') : ''
                }
            });
            const nameMatches = collectWantedMatches([ul], group.cat, 'li.item', mkExtra);
            group.items.push(...nameMatches);

            // Независимый фильтр по уровню: добавляем ВСЕХ персонажей с уровнем >=
            // порога, даже если имя не в списке (union, без дублей по li).
            const lf = loadLevelFilter(group.cat);
            if (lf.enabled && lf.min > 0) {
                const seen = new Set(nameMatches.map(m => m.li));
                ul.querySelectorAll('li.item').forEach(li => {
                    if (seen.has(li)) return;
                    if (extractItemLevel(li) < lf.min) return;
                    seen.add(li);
                    const base = mkExtra(li);
                    // Форма как у collectWantedMatches: { name, color, effect, li, ...extra }.
                    group.items.push(Object.assign({ name: base.name, color: group.cat.defaultColor, effect: 'none', li }, base.extra || {}));
                });
            }
        });
        const total = groups.reduce((sum, g) => sum + g.items.length, 0);
        // Порядок карточек = приоритет wanted-списка (перетаскивание в настройках).
        groups.forEach(g => { g.items = orderMatchesByWanted(g.items, g.cat, m => m.name); });

        const insertParent = (header && header.parentNode) ? header.parentNode : scrollWrapper.parentNode;
        const insertBefore = (header && header.parentNode) ? header.nextSibling : scrollWrapper;
        const { panel } = ensurePanel({
            panelId: 'rareMihoyoPanel',
            gearTitle: CATEGORIES.genshin.gearTitle,
            onGearClick: () => openSettings(CATEGORIES.genshin),
            bodyClass: 'rareMihoyoSections',
            insertBefore,
            insertParent
        });

        const sections = panel.querySelector('.rareMihoyoSections');
        sections.innerHTML = '';
        groups.forEach(group => {
            if (!group.items.length) return;
            const section = createNode('div');
            const title = createNode('div', 'rareMihoyoSectionTitle', group.title);
            const grid = createNode('div', 'rareCompactGrid rareFortniteGrid');
            group.items.forEach(m => {
                const rarityText = /role-rarity-5/.test(m.rarityClass) ? '5★'
                    : /role-rarity-4/.test(m.rarityClass) ? '4★'
                    : /rarity-s-icon/i.test(m.rarityImg) ? 'S'
                    : /rarity-a-icon/i.test(m.rarityImg) ? 'A' : '';
                const rarityClass = rarityText === '5★' ? 'is-five' : rarityText === '4★' ? 'is-four'
                    : rarityText === 'S' ? 'is-s' : rarityText === 'A' ? 'is-a' : '';
                const card = createCompactCard(m.color, m.effect, '',
                    '<div class="rareMihoyoCardImg">' +
                        (m.img ? '<img loading="lazy" src="' + m.img + '" alt="' + m.name + '">' : '') +
                        (rarityText ? '<span class="rareMihoyoBadge rarity ' + rarityClass + '">' + rarityText + '</span>' : '') +
                        (m.level ? '<span class="rareMihoyoBadge level">' + m.level + '</span>' : '') +
                        (m.fate ? '<span class="rareMihoyoBadge fate">' + m.fate + '</span>' : '') +
                    '</div>' +
                    '<div class="rareFortniteCardInfo"><div class="bottomContainer"><span class="Copy Tooltip"><span class="bold vbucks-icon-title rareFortniteCardName">' + m.name + '</span></span></div></div>');
                card.appendChild(createRareCompactFrame());
                grid.appendChild(card);
            });
            section.appendChild(title);
            section.appendChild(grid);
            sections.appendChild(section);
        });

        finalizePanel(panel, sections, total,
            countLabel(total, pluralRareItems),
            [scrollWrapper, 'rareOther_mihoyo', 'Все персонажи', 'персонажа', 'его', !!total]
        );
    }

    const findTanksList = () => document.querySelector('#WotTanks_xfUniqueId-1-1783969541 .tankList, [id^="WotTanks_"] .tankList');

    function buildTanksCategory(cat) {
        const list = findTanksList();
        if (!list) return;
        const container = list.closest('li') || list.parentNode;

        const matches = collectWantedMatches([list], cat, '.tank', tank => {
            const titleEl = tank.querySelector('.title');
            const img = tank.querySelector('img.tankImg, img');
            return { name: titleEl ? titleEl.textContent.trim().replace(/^\[\d+\]\s*/, '') : '', extra: { img: img ? img.getAttribute('src') : '' } };
        });

        const { panel } = ensurePanel({
            panelId: 'rareTanksPanel',
            gearTitle: cat.gearTitle,
            onGearClick: () => openSettings(cat),
            bodyClass: 'rareCompactGrid rareFortniteGrid',
            insertBefore: container,
            insertParent: container.parentNode
        });

        const grid = panel.querySelector('.rareFortniteGrid');
        grid.innerHTML = '';
        matches.forEach(m => {
            const card = createCompactCard(m.color, m.effect, '',
                '<div class="rareCompactCardImg rareFortniteCardImg">' + (m.img ? '<img loading="lazy" src="' + m.img + '" alt="' + m.name + '">' : '') + '</div>');
            card.appendChild(createFortniteHoverName(m.name));
            card.appendChild(createRareCompactFrame());
            grid.appendChild(card);
        });

        finalizePanel(panel, grid, matches.length, countLabel(matches.length, pluralRareItems), null);
    }

    const findBrawlLists = () => Array.from(document.querySelectorAll('ul[data-key="brawlers"]')).filter(ul => !ul.closest('.rareBucket') && !ul.closest('#rareBrawlPanel'));

    function getBrawlerStat(li, iconClass) {
        const icon = li.querySelector('i.' + iconClass);
        const stat = icon && icon.nextElementSibling && icon.nextElementSibling.classList.contains('stat') ? icon.nextElementSibling : null;
        const value = stat ? parseInt((stat.textContent || '').replace(/\D+/g, ''), 10) : 0;
        return Number.isFinite(value) ? value : 0;
    }

    function collectBrawlMatches(cat, lists) {
        const matches = [];
        lists.forEach(ul => {
            ul.querySelectorAll('li.supercellBrawler, li.item').forEach(li => {
                const name = (li.querySelector('.gameTitle') && li.querySelector('.gameTitle').textContent || li.querySelector('img[alt]') && li.querySelector('img[alt]').getAttribute('alt') || '').trim();
                if (!name) return;
                const w = matchWanted(name, cat);
                restoreOriginal(li);
                if (!w) return;
                const power = getBrawlerStat(li, 'fa-bolt');
                const trophies = getBrawlerStat(li, 'fa-trophy');
                const rank = getBrawlerStat(li, 'fa-medal');
                // Фильтр по родным характеристикам: сила / кубки / ранг (мин. пороги).
                const minPower = Math.max(0, parseInt(w.minPower, 10) || 0);
                const minTrophies = Math.max(0, parseInt(w.minTrophies, 10) || 0);
                const minRank = Math.max(0, parseInt(w.minRank, 10) || 0);
                if (minPower && power < minPower) return;
                if (minTrophies && trophies < minTrophies) return;
                if (minRank && rank < minRank) return;
                const img = li.querySelector('img.brawlerImg, img[alt]');
                const top = li.querySelector('.supercellBrawler--top');
                const rarity = top ? Array.from(top.classList).filter(c => c !== 'supercellBrawler--top').join(' ') : '';
                matches.push({
                    li,
                    name,
                    color: w.color,
                    effect: w.effect || 'none',
                    img: img ? img.getAttribute('src') : '',
                    trophies,
                    power,
                    rank,
                    rarity,
                    minPower
                });
            });
        });
        return matches;
    }

    function createBrawlCard(match) {
        const card = match.li.cloneNode(true);
        card.classList.add('rareCollItem', 'rareHoverGlow', 'rareBrawlCard');
        card.removeAttribute('data-rare-moved');
        card.style.removeProperty('display');
        card.style.setProperty('--rare-color', match.color);
        card.style.setProperty('border-color', match.color, 'important');
        const bottom = card.querySelector('.bottomContainer');
        if (bottom) {
            bottom.innerHTML = '';
            const stats = createNode('div', 'gameHoursPlayed');
            if (match.trophies) stats.appendChild(createBrawlStat('fa-trophy muted', match.trophies));
            if (match.power) stats.appendChild(createBrawlStat('fa-bolt', match.power));
            if (match.rank) stats.appendChild(createBrawlStat('fa-medal muted', match.rank));
            bottom.appendChild(createNode('div', 'bold gameTitle', match.name));
            bottom.appendChild(stats);
        }
        applyCardEffect(card, match.color, match.effect, { shimmerHost: card, ...DEFAULT_CARD_FX });
        return card;
    }

    function createBrawlStat(iconClass, value) {
        const frag = document.createDocumentFragment();
        frag.appendChild(createNode('i', 'fas ' + iconClass));
        frag.appendChild(createNode('span', 'stat', String(value)));
        return frag;
    }

    function buildBrawlCategory(cat) {
        const lists = findBrawlLists();
        if (!lists.length) return;
        const staleSteamPanel = document.getElementById('rareSteamPanel');
        if (staleSteamPanel) staleSteamPanel.remove();
        const staleSteamTitle = document.getElementById('rareOther_Steam');
        if (staleSteamTitle) staleSteamTitle.remove();

        const anchorUl = lists[0];
        const scrollWrapper = anchorUl.closest('.scroll-wrapper') || anchorUl.parentNode;
        // Иконка «+» на каждом бойце.
        lists.forEach(ul => ul.querySelectorAll('li.supercellBrawler, li.item').forEach(li => attachSourceAddButton(li, cat, li2 =>
            (li2.querySelector('.gameTitle') && li2.querySelector('.gameTitle').textContent
             || li2.querySelector('img[alt]') && li2.querySelector('img[alt]').getAttribute('alt') || ''))));
        const matches = orderMatchesByWanted(collectBrawlMatches(cat, lists), cat, m => m.name);

        const { panel } = ensurePanel({
            panelId: 'rareBrawlPanel',
            gearTitle: cat.gearTitle,
            onGearClick: () => openSettings(cat),
            bodyClass: 'rareMihoyoSections',
            insertBefore: scrollWrapper
        });

        const sections = panel.querySelector('.rareMihoyoSections');
        sections.innerHTML = '';
        if (matches.length) {
            const grid = createNode('ul', 'body rareBrawlGrid');
            matches.forEach(m => grid.appendChild(createBrawlCard(m)));
            sections.appendChild(grid);
        }

        finalizePanel(panel, sections, matches.length,
            countLabel(matches.length, pluralBrawlers, ' Brawl Stars'),
            [scrollWrapper, 'rareOther_Brawl', 'Все бойцы', 'бойца', 'его', !!matches.length]
        );
    }

    function findSteamLists() {
        const lists = [];
        // На Steam-странице список игр — это ul.body внутри .marketItemView--gamesContainer
        // (структура как у VALORANT). Отличаем по наличию .gameTitle / .gameHoursPlayed.
        document.querySelectorAll('.marketItemView--gamesContainer ul.body, ul.body[data-save-url]').forEach(ul => {
            if (ul.closest('.rareBucket')) return;
            if ((ul.getAttribute('data-key') || '') === 'brawlers' || ul.querySelector('.supercellBrawler')) return;
            if (ul.querySelector('.gameTitle, .gameHoursPlayed')) lists.push(ul);
        });
        return lists;
    }

    const findSteamMedalItems = () => Array.from(document.querySelectorAll('.steamCsgoMedals .medal.item, .steamCsgoMedalsContainer .medal.item'));

    function collectSteamMedalMatches(cat) {
        const items = findSteamMedalItems();
        if (!items.length) return [];

        const matches = [];
        items.forEach(item => {
            const img = item.querySelector('img.medalImg, img[alt]');
            const name = ((img && (img.getAttribute('alt') || img.getAttribute('data-cachedtitle'))) || '').trim();
            if (!name) return;
            const w = matchWanted(name, cat);
            if (!w) return;
            matches.push({
                node: item,
                name,
                color: w.color,
                effect: w.effect || 'none',
                img: img ? img.getAttribute('src') : ''
            });
        });
        return matches;
    }

    function collectSteamGameMatches(cat, lists) {
        const matches = [];
        lists.forEach(ul => {
            ul.querySelectorAll('li.item').forEach(li => {
                const name = getItemName(li).trim();
                const w = matchWanted(name, cat);
                if (!w) return;
                const img = li.querySelector('img');
                const hoursEl = li.querySelector('.gameHoursPlayed');
                matches.push({
                    id: li.getAttribute('data-id') || '',
                    name,
                    color: w.color,
                    effect: w.effect || 'none',
                    img: img ? img.getAttribute('src') : '',
                    href: (li.querySelector('a') && li.querySelector('a').getAttribute('href')) || '',
                    hours: hoursEl ? hoursEl.textContent.replace(/\s+/g, ' ').trim() : ''
                });
            });
        });
        return matches;
    }

    function buildSteamCardHtml(match, extraInfo) {
        const img = match.img ? `<img loading="lazy" src="${match.img}" alt="${match.name}">` : '';
        return `<div class="rareSteamCardImg">${img}</div>`
             + `<div class="rareSteamCardInfo"><div class="rareSteamCardName">${match.name}</div>${extraInfo || ''}</div>`;
    }

    function createSteamGameCard(match) {
        const card = createNode('a', 'rareSteamCard rareHoverGlow');
        if (match.href) { card.href = match.href; card.target = '_blank'; card.rel = 'nofollow noopener'; }
        card.style.setProperty('--rare-color', match.color);
        card.style.setProperty('border-color', match.color, 'important');
        card.innerHTML = buildSteamCardHtml(match, `<div class="rareSteamCardHours">${clockSvg()}<span>${match.hours}</span></div>`);
        applyCardEffect(card, match.color, match.effect, { shimmerHost: card, ...DEFAULT_CARD_FX });
        const priceMeta = { kind: 'steam-game', itemId: match.id, name: match.name };
        attachPriceHoverMenu(card, buildSteamGameMarketUrl(match.id), priceMeta);
        return card;
    }

    function createSteamMedalCard(match) {
        const wrap = createNode('div', 'rareSteamMedalWrap rareHoverGlow');
        wrap.style.setProperty('--rare-color', match.color);
        const card = createNode('div', 'rareSteamCard rareSteamMedalCard');
        card.style.setProperty('--rare-color', match.color);
        card.innerHTML = buildSteamCardHtml(match);
        applyCardEffect(card, match.color, match.effect, { baseShadow: 'inset 0 1px 0 rgba(255,255,255,.06),0 12px 24px rgba(0,0,0,.2)', shimmerHost: card, shimmerRadius: '18px' });
        wrap.appendChild(card);
        appendHoverLabel(wrap, match.name);
        return wrap;
    }

    function buildSteamCategory(cat) {
        const lists = findSteamLists();
        if (!lists.length) return;
        const oldMedalsPanel = document.getElementById('rareSteamMedalsPanel');
        if (oldMedalsPanel) oldMedalsPanel.remove();

        const anchorUl = lists[0];
        const scrollWrapper = anchorUl.closest('.scroll-wrapper') || anchorUl.parentNode;
        // Иконка «+» на каждой игре Steam и каждой медали.
        lists.forEach(ul => ul.querySelectorAll('li.item').forEach(li => attachSourceAddButton(li, cat, getItemName)));
        findSteamMedalItems().forEach(item => attachSourceAddButton(item, CATEGORIES.steammedals, node => {
            const img = node.querySelector('img.medalImg, img[alt]');
            return (img && (img.getAttribute('alt') || img.getAttribute('data-cachedtitle'))) || '';
        }));
        const matches = orderMatchesByWanted(collectSteamGameMatches(cat, lists), cat, m => m.name);
        const medalMatches = orderMatchesByWanted(collectSteamMedalMatches(CATEGORIES.steammedals), CATEGORIES.steammedals, m => m.name);
        const total = matches.length + medalMatches.length;

        const { panel } = ensurePanel({
            panelId: 'rareSteamPanel',
            gearTitle: cat.gearTitle,
            onGearClick: () => openSettings(cat),
            bodyClass: 'rareMihoyoSections',
            insertBefore: scrollWrapper
        });

        const sections = panel.querySelector('.rareMihoyoSections');
        sections.innerHTML = '';
        const showTitles = !!(matches.length && medalMatches.length);

        [
            { items: matches,      gridClass: 'rareSteamGrid',                   createCard: createSteamGameCard, label: () => countLabel(matches.length, pluralValuableGames) },
            { items: medalMatches, gridClass: 'rareSteamGrid rareSteamMedalsGrid', createCard: createSteamMedalCard, label: () => countLabel(medalMatches.length, pluralRareMedals) },
        ].forEach(({ items, gridClass, createCard, label }) => {
            if (!items.length) return;
            const section = createNode('div');
            const grid = createNode('div', gridClass);
            items.forEach(m => grid.appendChild(createCard(m)));
            if (showTitles) section.appendChild(createNode('div', 'rareMihoyoSectionTitle', label()));
            section.appendChild(grid);
            sections.appendChild(section);
        });

        const titleText = total
            ? [matches.length && countLabel(matches.length, pluralValuableGames),
               medalMatches.length && countLabel(medalMatches.length, pluralRareMedals)]
                .filter(Boolean).join(' • ')
            : NO_RARE_ITEMS_TEXT;

        finalizePanel(panel, sections, total, titleText,
            [scrollWrapper, 'rareOther_' + cat.key, 'Все игры', 'игру', 'её', !!total]
        );
    }

    function findUbisoftLists() {
        const lists = [];
        document.querySelectorAll('.r6Skins ul.body[data-key="skins"], .marketItemView--gamesContainer.r6Skins ul.body[data-key="skins"]').forEach(ul => {
            if (!ul.closest('.rareBucket') && !ul.closest('#rareFortnitePanel') && !ul.closest('#rareSteamPanel')) lists.push(ul);
        });
        return lists;
    }

    function makeCollectionCard(li) {
        const clone = li.cloneNode(true);
        clone.classList.add('rareCollItem', 'rareHoverGlow');
        clone.removeAttribute('data-rare-moved');
        clone.style.removeProperty('display');
        return clone;
    }

    function applyCollectionEffect(el, color, effect) {
        applyCardEffect(el, color, effect, { shimmerHost: el, ...DEFAULT_CARD_FX });
    }

    const createFortniteHoverName = name => createNode('div', 'rareFortniteHoverName', name || '');

    const createRareCompactFrame = () => { const f = createNode('span', 'rareCompactFrame'); f.setAttribute('aria-hidden', 'true'); return f; };

    const COLLECTION_ICONS = {
        'black ice': 'https://i.imgur.com/MRtPvm8.png',
        'glacier': 'https://i.imgur.com/wmcUg95.png'
    };
    const FORTNITE_CARD_IMAGE_OVERRIDES = {
        [norm('OG Ghoul Trooper')]: 'https://i.imgur.com/ACtVAsO.png',
        [norm('OG Skull Trooper')]: 'https://i.imgur.com/IC4jgqL.png',
        [norm('Renegade Raider (OG)')]: 'https://i.imgur.com/Fmn0zVi.png',
        [norm("Raider's Revenge (OG)")]: 'https://i.imgur.com/EEkERfB.png'
    };

    function collectionIconHtml(group) {
        const url = COLLECTION_ICONS[norm(group.name)];
        return url
            ? `<span class="rareCollectionGem rareCollectionGemImg"><img src="${url}" alt="${group.name}"></span>`
            : `<span class="rareCollectionGem">${gemSvg()}</span>`;
    }

    function renderCollection(cat, group) {
        const color = group.color;
        const items = group.items;
        const wrap = createNode('div', 'rareCollection');
        wrap.style.setProperty('--rare-color', color);
        wrap.style.setProperty('border-color', color, 'important');
        applyCollectionEffect(wrap, color, group.effect || 'none');

        const head = createNode('div', 'rareCollectionHead rareHoverGlow');
        head.innerHTML =
            collectionIconHtml(group) +
            `<span class="rareCollectionName">${group.name}</span>` +
            `<span class="rareCollectionCount">${items.length}</span>` +
            `<span class="rareCollectionCountLbl">${pluralPlainItems(items.length)}</span>` +
            `<span class="rareCollectionArrow">${chevronSvg()}</span>`;

        const body = createNode('div', 'rareCollectionBody');
        const games = createNode('div', 'rareCollectionGames ' + (group.gamesClass || ''));
        const ul = createNode('ul', group.ulClass || 'body');
        ul.removeAttribute('data-key');
        games.appendChild(ul);
        body.appendChild(games);

        function renderAll() {
            ul.innerHTML = '';
            items.forEach(it => ul.appendChild(makeCollectionCard(it.li)));
        }
        renderAll();

        head.addEventListener('click', () => {
            wrap.classList.toggle('open');
        });

        const arrow = head.querySelector('.rareCollectionArrow');
        arrow.addEventListener('click', (e) => {
            e.stopPropagation();
            wrap.classList.toggle('open');
        });

        wrap.appendChild(head);
        wrap.appendChild(body);
        return wrap;
    }

    function buildUbisoftCategory(cat) {
        const lists = findUbisoftLists();
        if (!lists.length) return;

        const anchorUl = lists[0];
        const scrollWrapper = resolveScrollWrapper(anchorUl);
        const gamesClass = getRiotGamesClass(anchorUl, 'r6Skins marketItemView--gamesContainer');
        const ulClass = anchorUl.className || 'body';

        const groupsMap = new Map();
        const order = [];
        let total = 0;
        collectWantedMatches(lists, cat, 'li.item', li => ({ name: getItemName(li), after: () => restoreOriginal(li) })).forEach(m => {
            const key = norm(m.w.name);
            let g = groupsMap.get(key);
            if (!g) { g = { name: m.w.name.toUpperCase(), color: m.color, effect: m.effect, gamesClass, ulClass, items: [] }; groupsMap.set(key, g); order.push(g); }
            g.items.push({ li: m.li, effect: m.effect });
            total++;
        });

        const { panel } = ensurePanel({
            panelId: 'rareUbisoftPanel',
            gearTitle: cat.gearTitle,
            onGearClick: () => openSettings(cat),
            bodyClass: 'rareCollections',
            insertBefore: scrollWrapper
        });

        const box = panel.querySelector('.rareCollections');
        box.innerHTML = '';
        // Группы (по wanted-имени) — в порядке приоритета wanted-списка.
        orderMatchesByWanted(order, cat, g => g.name).forEach(g => box.appendChild(renderCollection(cat, g)));

        finalizePanel(panel, box, total,
            countLabel(total, pluralRareSkins),
            [scrollWrapper, 'rareOther_' + cat.game, 'Все скины', 'скин', 'его', !!total]
        );
    }

    let wrappersRestored = false;
    let floatingButtonPositionTimer = 0;
    let floatingButtonWatchersReady = false;
    function cleanupDetachedHoverLabels() {
        hoverLabelRegistry.forEach(entry => {
            if (!entry || !entry.card || document.body.contains(entry.card)) return;
            hoverLabelRegistry.delete(entry);
            if (entry.label && entry.label.parentNode) entry.label.parentNode.removeChild(entry.label);
        });
    }
    const BUILD_MAP = {
        fortnite: () => buildFortniteCategory(CATEGORIES.fortnite),
        mihoyo: () => buildMihoyoCategory(CATEGORIES.mihoyo),
        valorant: () => {
            buildValorantCombined();
            const oldLolPanel = document.getElementById('rareLolPanel');
            if (oldLolPanel) oldLolPanel.remove();
        },
        steam: () => buildSteamCategory(CATEGORIES.steam),
        supercell: () => buildBrawlCategory(CATEGORIES.brawl),
        tanks: () => buildTanksCategory(CATEGORIES.tanks),
        ubisoft: () => buildUbisoftCategory(CATEGORIES.ubisoft)
    };

    function rebuild() {
        if (!wrappersRestored) { restoreWrappers(); wrappersRestored = true; }
        cleanupDetachedHoverLabels();
        const game = detectGame();
        if (BUILD_MAP[game]) BUILD_MAP[game]();
        buildSteamInventoryMarketPrice().catch(() => {});
        buildSteamItemPageInventoryMarketPrice().catch(() => {});
        updateLastActivityDays();
        ensureAutoTitleButton();
        ensureFunpayButton();
        ensureFloatingButton();
        ensureFloatingButtonWatchers();
        positionFloatingButton();
        initRareHoverEffects();
        applyCustom();
    }

    const START_CAT_MAP = { fortnite: 'fortnite', mihoyo: 'genshin', steam: 'steam', supercell: 'brawl', tanks: 'tanks', ubisoft: 'ubisoft' };

    function ensureFloatingButton() {
        if (document.getElementById('rareFloatBtn')) return;
        const btn = document.createElement('div');
        btn.id = 'rareFloatBtn';
        btn.innerHTML = marketSvg();
        btn.addEventListener('click', () => {
            if (document.getElementById('rareModal')) return;
            const startCat = CATEGORIES[START_CAT_MAP[detectGame()] || 'skins'];
            openSettings(startCat);
        });
        btn.addEventListener('mouseenter', () => {
            if (btn.dataset.hoverBg) btn.style.setProperty('background', btn.dataset.hoverBg, 'important');
        });
        btn.addEventListener('mouseleave', () => { applyCustom(); });
        const chat = findFloatingButtonAnchor();
        if (chat) {
            const rect = chat.getBoundingClientRect();
            const rightGap = Math.max(0, Math.round(window.innerWidth - rect.right));
            const bottomGap = Math.max(0, Math.round(window.innerHeight - rect.bottom));
            const width = Math.round(rect.width) || 60;
            btn.style.right = (rightGap + width + 4) + 'px';
            btn.style.bottom = bottomGap + 'px';
        } else {
            btn.style.right = '5px';
            btn.style.bottom = '15px';
        }
        document.body.appendChild(btn);
        ensureFloatingButtonWatchers();
        applyCustom();
        positionFloatingButton();
    }

    function findFloatingButtonAnchor() {
        const selectors = [
            '.chat2-button',
            '[class*="chat2-button"]',
            '.chat-button',
            '[class*="chat-button"]',
            '[class*="support-chat"]',
            '[class*="intercom"]',
            '[class*="crisp"]'
        ];
        for (const selector of selectors) {
            const nodes = document.querySelectorAll(selector);
            for (const node of nodes) {
                if (!(node instanceof HTMLElement)) continue;
                const rect = node.getBoundingClientRect();
                const style = getComputedStyle(node);
                if (style.display === 'none' || style.visibility === 'hidden') continue;
                if (rect.width < 24 || rect.height < 24) continue;
                if (style.position !== 'fixed') continue;
                if (rect.right < window.innerWidth * 0.6) continue;
                if (rect.bottom < window.innerHeight * 0.55) continue;
                return node;
            }
        }
        return null;
    }

    function scheduleFloatingButtonPosition() {
        if (floatingButtonPositionTimer) return;
        floatingButtonPositionTimer = setTimeout(() => {
            floatingButtonPositionTimer = 0;
            positionFloatingButton();
        }, 120);
    }

    function ensureFloatingButtonWatchers() {
        if (floatingButtonWatchersReady) return;
        floatingButtonWatchersReady = true;
        window.addEventListener('resize', scheduleFloatingButtonPosition, { passive: true });
        window.addEventListener('scroll', scheduleFloatingButtonPosition, { passive: true });
        // Якорь-чат появляется не сразу после загрузки страницы. Вместо редких
        // отложенных таймеров (300/1200/2500 мс — из-за них кнопка «прыгала» на месте
        // через ~0.3 c) быстро опрашиваем позицию по кадрам, пока якорь не найдётся,
        // но не дольше ~3 с — так кнопка встаёт правильно практически мгновенно.
        let tries = 0;
        const maxTries = 60; // ~3 c при шаге 50 мс
        const tick = () => {
            positionFloatingButton();
            tries++;
            if (findFloatingButtonAnchor() || tries >= maxTries) return;
            setTimeout(tick, 50);
        };
        requestAnimationFrame(tick);
    }

    function positionFloatingButton() {
        const btn = document.getElementById('rareFloatBtn');
        if (!btn) return;
        if (!CUSTOM.btnShow) { btn.style.display = 'none'; return; }
        const chat = findFloatingButtonAnchor();
        if (chat) {
            const rect = chat.getBoundingClientRect();
            const rightGap = Math.max(0, Math.round(window.innerWidth - rect.right));
            const bottomGap = Math.max(0, Math.round(window.innerHeight - rect.bottom));
            const width = Math.round(rect.width) || 60;
            btn.style.right = (rightGap + width + 4) + 'px';
            btn.style.bottom = bottomGap + 'px';
            btn.style.display = getComputedStyle(chat).display === 'none' ? 'none' : 'flex';
        } else {
            btn.style.right = '5px';
            btn.style.bottom = '15px';
            btn.style.display = 'flex';
        }
    }

    function initRareHoverEffects() {
        document.querySelectorAll('.rareHoverGlow').forEach(el => {
            if (el.dataset.rareHoverInit === '1') return;
            el.dataset.rareHoverInit = '1';
            const collection = el.classList.contains('rareCollectionHead') ? el.closest('.rareCollection') : null;
            if (collection && !collection.style.getPropertyValue('--rare-head-height')) {
                collection.style.setProperty('--rare-head-height', el.offsetHeight + 'px');
            }
            let hoverFrame = 0;
            let lastHoverEvent = null;
            const setPos = (e) => {
                lastHoverEvent = e;
                if (hoverFrame) return;
                hoverFrame = requestAnimationFrame(() => {
                    hoverFrame = 0;
                    if (!lastHoverEvent) return;
                    const rect = el.getBoundingClientRect();
                    const x = (lastHoverEvent.clientX - rect.left) + 'px';
                    const y = (lastHoverEvent.clientY - rect.top) + 'px';
                    el.style.setProperty('--mouse-x', x);
                    el.style.setProperty('--mouse-y', y);
                    if (collection) {
                        collection.style.setProperty('--mouse-x', x);
                        collection.style.setProperty('--mouse-y', y);
                    }
                });
            };
            if (collection) {
                el.addEventListener('mouseenter', () => collection.classList.add('rareHoverActive'));
                el.addEventListener('mouseleave', () => collection.classList.remove('rareHoverActive'));
            }
            el.addEventListener('mousemove', setPos);
            el.addEventListener('mouseenter', setPos);
        });
    }

    let rareObserver = null;
    let rebuildScheduled = false;
    let lastRebuildSignature = '';
    const RARE_GENERATED_SELECTOR = '#rareValorantPanel,#rareFortnitePanel,#rareSteamPanel,.rareBucket,.rareCollectionGames,.rarePricePlate,.rareHoverMenu,.rareSkinsGearPalette,#rareModal,#rareFloatBtn';
    const RARE_SOURCE_SELECTOR = 'ul[data-key],ul.body[data-save-url],.marketItemView--gamesContainer,.fortniteItems,.r6Skins,.title-account,.itemDescription,.marketItemView--ParsedInfo';

    function mutationTouchesRareSource(record) {
        const target = record.target && record.target.nodeType === 1 ? record.target : record.target && record.target.parentElement;
        if (target && target.closest(RARE_GENERATED_SELECTOR)) return false;
        if (target && target.closest(RARE_SOURCE_SELECTOR)) return true;
        const changed = Array.from(record.addedNodes).concat(Array.from(record.removedNodes));
        return changed.some(node => {
            if (!node || node.nodeType !== 1) return false;
            if (node.matches(RARE_GENERATED_SELECTOR)) return false;
            return node.matches(RARE_SOURCE_SELECTOR) || !!node.querySelector(RARE_SOURCE_SELECTOR);
        });
    }

    function scheduleRebuild() {
        if (rebuildScheduled) return;
        rebuildScheduled = true;
        setTimeout(() => {
            rebuildScheduled = false;
            const signature = location.pathname + location.search + '|' + detectGame() + '|' + Array.from(document.querySelectorAll('ul[data-key],ul.body[data-save-url],.marketItemView--gamesContainer,.fortniteItems,.r6Skins,.marketItemView--ParsedInfo')).map(el => el.childElementCount || 0).join(',');
            if (signature === lastRebuildSignature) return;
            lastRebuildSignature = signature;
            if (rareObserver) rareObserver.disconnect();
            rebuild();
            if (rareObserver) rareObserver.observe(document.body, { childList: true, subtree: true });
        }, 600);
    }

    /* =========================================================================
       FUNPAY RESELLER — авто-перепродажа c LZT на FunPay через golden_key.
       Архитектура через адаптеры игр/категорий: FUNPAY_ADAPTERS.
       ========================================================================= */

    const FUNPAY_UPLOADER_LS_KEY = 'rareFunpay_uploader';
    const FUNPAY_HISTORY_LS_KEY = 'rareFunpay_history';
    const FUNPAY_QUEUE_LS_KEY = 'rareFunpay_queue';
    const FUNPAY_LOCK_LS_KEY = 'rareFunpay_lock';
    const FUNPAY_HISTORY_MAX = 200;
    // Heartbeat-лок: активная вкладка обновляет метку раз в FUNPAY_LOCK_RENEW,
    // независимо от того, сколько длятся сетевые запросы (renew на таймере, не в
    // цепочке await). Лок считается «мёртвым», если метка старше FUNPAY_LOCK_TTL.
    // Один лот делается 15-25с, но живая вкладка всё это время шлёт heartbeat
    // каждые 5с, поэтому TTL 20с безопасен и даёт быстрый подхват при закрытии.
    const FUNPAY_LOCK_RENEW = 5 * 1000;            // период heartbeat
    const FUNPAY_LOCK_TTL = 20 * 1000;             // после этого вкладка считается мёртвой
    const FUNPAY_TAKEOVER_POLL = 7 * 1000;         // как часто простаивающая вкладка проверяет осиротевшую очередь
    const FUNPAY_ORIGIN = 'https://funpay.com';
    // Ограничения картинок FunPay.
    const FUNPAY_IMG_MAX_BYTES = 7 * 1024 * 1024;   // 7 МБ
    const FUNPAY_IMG_MAX_SIDE = 4100;               // максимум по стороне
    const FUNPAY_IMG_MIN_SIDE = 10;                 // минимум по стороне
    const FUNPAY_IMG_MAX_PER_LOT = 10;              // лимит картинок на один лот
    const FUNPAY_UPLOAD_CONCURRENCY = 3;           // сколько картинок заливать одновременно
    const FUNPAY_REQ_TIMEOUT = 30000;              // общий дефолт (запасной)
    // Таймауты по этапам публикации (мс). При среднем интернете сервер отвечает
    // за 1-3с; это аварийные потолки «сервер завис».
    const FUNPAY_TO_LZT_RESPONSE = 25000;          // ожидание ответа LZT (заголовки)
    const FUNPAY_TO_LZT_DOWNLOAD = 25000;          // скачивание тела одной картинки с LZT
    const FUNPAY_TO_FP_UPLOAD = 15000;             // залив одной картинки на FunPay
    const FUNPAY_TO_OFFER_EDIT = 10000;            // страница создания лота (csrf)
    const FUNPAY_TO_OFFER_SAVE = 15000;            // публикация лота (offerSave)
    const FUNPAY_TO_TRADE = 10000;                 // парс страницы /trade
    const FUNPAY_TRADE_TOP_N = 5;                  // сколько верхних (свежих) лотов учитывать в /trade
    // Тексты ошибок картинок (fail-fast: без картинок лот не публикуется).
    const FUNPAY_ERR_LZT_SLOW = 'Долгий ответ от MARKET на скачивание картинок';
    const FUNPAY_ERR_FP_SLOW = 'Долгая загрузка картинок на FunPay';
    const FUNPAY_ERR_UPLOAD_LIMIT = 'Превышен максимальный объем загрузок на FunPay!';
    // Признак ответа FunPay о превышении лимита загрузок (по тексту ошибки).
    const isFunpayUploadLimit = msg => /превышен максимальн|максимальный объ[её]м загруз|maximum upload|upload limit/i.test(String(msg || ''));

    const DEFAULT_FUNPAY_UPLOADER = {
        goldenKey: '',
        categories: Object.fromEntries(FUNPAY_ADAPTER_KEYS.map(k => [k, defaultFunpayCategoryCfg(k)]))
    };

    function normalizeFunpayUploader(o) {
        const src = isPlainObject(o) ? o : {};
        const next = { goldenKey: String(src.goldenKey || '').trim(), categories: {} };
        const srcCats = isPlainObject(src.categories) ? src.categories : {};
        FUNPAY_ADAPTER_KEYS.forEach(key => {
            const c = isPlainObject(srcCats[key]) ? srcCats[key] : {};
            // Отсутствующее название (новая категория) => дефолт; пустая строка (очищено вручную) => пусто.
            next.categories[key] = {
                summaryRu: String(c.summaryRu != null ? c.summaryRu : FUNPAY_DEFAULT_TITLE),
                summaryEn: String(c.summaryEn != null ? c.summaryEn : FUNPAY_DEFAULT_TITLE),
                descRu: String(c.descRu != null ? c.descRu : (c.descTemplate || '')),
                descEn: String(c.descEn != null ? c.descEn : (c.descTemplateEn || ''))
            };
        });
        return next;
    }

    const _funpayStore = makeSettingsStore(FUNPAY_UPLOADER_LS_KEY, DEFAULT_FUNPAY_UPLOADER, normalizeFunpayUploader);
    const loadFunpayUploader = () => _funpayStore.load();
    const saveFunpayUploader = o => _funpayStore.save(o);
    let FUNPAY = loadFunpayUploader();
    const funpayCatCfg = key => (FUNPAY.categories && FUNPAY.categories[key]) || defaultFunpayCategoryCfg(key);

    // --- История публикаций --------------------------------------------------
    const loadFunpayHistory = () => loadStoredArray(FUNPAY_HISTORY_LS_KEY);
    function addFunpayHistory(entry) {
        const record = Object.assign({ id: 'fp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7), at: Date.now() }, entry);
        prependStoredEntry(loadFunpayHistory, arr => saveStoredArray(FUNPAY_HISTORY_LS_KEY, arr, FUNPAY_HISTORY_MAX), record, refreshFunpayHistoryView);
        return record;
    }

    // --- Шаблоны -------------------------------------------------------------
    // Максимум символов в названии лота на FunPay.
    const FUNPAY_TITLE_MAX = 100;

    // Названия скинов Valorant на LZT полностью на русском (напр. «КЛИНОК УСКОРЕНИЕ»),
    // а FunPay в англоязычном описании запрещает кириллицу. Полноценный перевод в
    // официальные английские названия невозможен без огромного словаря коллекций,
    // поэтому делаем ТРАНСЛИТЕРАЦИЮ (RU -> латиница): редкие имена сохраняются в EN-лоте
    // читаемой латиницей, но требуют ручной проверки/корректировки продавцом.
    const RU_TRANSLIT_MAP = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i',
        'й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t',
        'у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ъ':'','ы':'y',
        'ь':'','э':'e','ю':'yu','я':'ya'
    };
    function transliterateRu(str) {
        let out = '';
        for (const ch of String(str || '')) {
            const lower = ch.toLowerCase();
            const mapped = RU_TRANSLIT_MAP[lower];
            if (mapped == null) { out += ch; continue; } // не кириллица — как есть
            // Сохраняем регистр: заглавная кириллица -> заглавная первая буква латиницы.
            out += (ch !== lower && mapped) ? (mapped.charAt(0).toUpperCase() + mapped.slice(1)) : mapped;
        }
        return out;
    }
    // Транслитерирует массив имён редких для EN-лота (кириллица -> латиница).
    function translateRareNamesForEn(rareNames) {
        return (rareNames || []).map(transliterateRu);
    }

    // Подстановки: {count} (число + слово: RU «скинов» со склонением / EN «skins»),
    // {rare} (редкие предметы). lang: 'ru' | 'en'.
    // rareNames — массив имён (переопределяется при подгонке длины).
    // Адаптер может добавить свои плейсхолдеры через adapter.templatePlaceholders(ctx,lang)
    // (например Valorant: {agents}, {rank}) — они объединяются с базовыми {count}/{rare}.
    function renderFunpayTemplate(tpl, ctx, lang, rareNames) {
        const count = ctx.count != null ? ctx.count : 0;
        const word = lang === 'en' ? 'skins' : pluralSkins(count);
        // Для английского лота переводим русские названия редких скинов.
        const names = lang === 'en' ? translateRareNamesForEn(rareNames) : (rareNames || []);
        const map = {
            count: ctx.count != null ? (count + ' ' + word) : '',
            rare: names.join(', ')
        };
        // Плейсхолдеры от адаптера (не перетирают уже заданные пустыми базовые).
        const adapter = ctx.adapter;
        if (adapter && typeof adapter.templatePlaceholders === 'function') {
            const extra = adapter.templatePlaceholders(ctx, lang, names) || {};
            Object.keys(extra).forEach(k => { map[k] = extra[k]; });
        }
        // Заменяем любые {key}, для которых есть значение в map (иначе пусто).
        return String(tpl || '')
            .replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => (map[key] != null ? map[key] : ''))
            .replace(/\s*\|\s*(?=$|\|)/g, ' ')      // "текст | " (в конце) -> "текст "
            .replace(/^\s*\|\s*/, '')               // ведущий "| "
            .replace(/\s*\|\s*$/, '')               // хвостовой " |"
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    // Строит название с учётом лимита символов: если длинно и есть {rare},
    // удаляет редкие имена с конца, пока не влезет (не режет слова).
    function applyFunpayTemplate(tpl, ctx, lang, maxLen) {
        const limit = maxLen || 0;
        let rare = (ctx.rareNames || []).slice();
        let out = renderFunpayTemplate(tpl, ctx, lang, rare);
        if (!limit) return out;
        while (out.length > limit && rare.length) {
            rare.pop();
            out = renderFunpayTemplate(tpl, ctx, lang, rare);
        }
        // Если даже без редких не влезает (длинный {count}/текст) — жёсткая обрезка.
        return out.length > limit ? out.slice(0, limit).trim() : out;
    }

    // --- Данные текущего товара LZT -----------------------------------------
    function getLztItemId() {
        const save = document.querySelector('.Editable.EditableValue[data-save-url]');
        const fromSave = save && (save.getAttribute('data-save-url') || '').match(/^(\d+)\//);
        if (fromSave) return fromSave[1];
        const fromPath = (location.pathname.match(/\/(\d+)(?:[/?#]|$)/) || [])[1];
        return fromPath || '';
    }
    function getLztItemUrl() {
        const id = getLztItemId();
        return id ? ('https://lzt.market/' + id + '/') : location.href.split('?')[0];
    }
    function getLztPrice() {
        const el = document.querySelector('.Editable.EditableValue[data-key="price"]');
        if (!el) return '';
        const raw = el.getAttribute('data-value') || el.textContent || '';
        const num = parseInt(String(raw).replace(/[^\d]/g, ''), 10);
        return Number.isFinite(num) && num > 0 ? String(num) : '';
    }

    // --- HTTP FunPay через golden_key ---------------------------------------
    // Единый текст ошибки для нерабочего/истёкшего golden_key.
    const FUNPAY_AUTH_ERROR = 'golden_key недействителен или истёк — обновите его во вкладке Uploader';

    // Признаки того, что FunPay отдал страницу для неавторизованного пользователя:
    // нет ссылки на профиль/приложение, есть форма входа или ссылка «Войти».
    function funpayLooksLoggedOut(doc, rawHtml) {
        if (doc && (doc.querySelector('.user-link-name') || doc.querySelector('body[data-app-data]'))) {
            // Дополнительно: авторизованный body несёт userId != 0.
            const appEl = doc.querySelector('body[data-app-data]');
            if (appEl) {
                try {
                    const app = JSON.parse(appEl.getAttribute('data-app-data')) || {};
                    if (app.userId != null && Number(app.userId) === 0) return true;
                } catch (e) {}
            }
            return false;
        }
        const html = String(rawHtml || '');
        if (/name=["']login["']|id=["']login["']|\/account\/login|class=["'][^"']*form-registration/i.test(html)) return true;
        // Пустой/короткий ответ без признаков авторизации тоже считаем разлогином.
        return html.length < 200 || /Войти|Sign in/i.test(html);
    }

    // Проверяет ответ offerSave: HTML вместо JSON на неавторизованной сессии.
    // 428 с пустым телом на offerSave = сессия не авторизована (у валидного
    // golden_key FunPay всегда возвращает JSON-тело, даже при ошибке валидации).
    function funpayDetectAuthFailure(status, rawText) {
        if (status === 401 || status === 403) return true;
        const t = String(rawText || '').trim();
        if (!t) return status === 428; // пустой 428 => разлогин
        // JSON-тело: FunPay при невалидном golden_key отдаёт {"msg":"Необходимо
        // авторизоваться.","error":1}. Ловим именно это, остальной JSON — не auth.
        if (t.charAt(0) === '{' || t.charAt(0) === '[') {
            return /необходимо\s+авторизоваться|authorization\s+required|not\s+authorized|unauthorized/i.test(t);
        }
        return /name=["']login["']|\/account\/login|form-registration|Войти|Sign in/i.test(t);
    }

    // Маскирует golden_key для логов: первые/последние 4 символа + длина.
    const maskGoldenKey = k => { const s = String(k || ''); return s ? (s.slice(0, 4) + '…' + s.slice(-4) + ' (len=' + s.length + ')') : '<пусто>'; };

    // FunPay требует User-Agent (иначе 403). Берём реальный UA браузера.
    const FUNPAY_UA = (typeof navigator !== 'undefined' && navigator.userAgent)
        ? navigator.userAgent
        : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

    // Авторизация FunPay идёт cookie golden_key, которую мы ставим руками. ВАЖНО:
    // запросы шлём БЕЗ anonymous — иначе Tampermonkey вырезает кастомный заголовок
    // Cookie, и FunPay отвечает 403 «Необходимо авторизоваться».
    const FUNPAY_ANON = false;

    function funpayHeaders(extra) {
        // Всегда берём АКТУАЛЬНЫЙ ключ строго из хранилища (не из памяти вкладки и
        // без fallback на старую in-memory FUNPAY): если ключ поменяли — используется
        // именно новый. Fallback на FUNPAY раньше маскировал смену ключа старым значением.
        const goldenKey = String(loadFunpayUploader().goldenKey || '').trim();
        if (!goldenKey) throwError('Не указан golden_key FunPay (вкладка Uploader)');
        FP_LOG('funpayHeaders golden_key used:', maskGoldenKey(goldenKey));
        // ВАЖНО (фикс смены аккаунта): FunPay на первый запрос отдаёт Set-Cookie
        // PHPSESSID и ПРИВЯЗЫВАЕТ серверную сессию к аккаунту. При anonymous:false
        // этот PHPSESSID оседает в общем cookie jar браузера и АВТОМАТИЧЕСКИ
        // дописывается ко всем следующим запросам. Тогда даже с новым golden_key
        // сервер определяет старый аккаунт по залипшему PHPSESSID — лот уходит не туда.
        // Затираем PHPSESSID пустым значением в нашем Cookie: заставляем FunPay
        // выдать новую сессию именно под актуальный golden_key.
        const cookie = 'PHPSESSID=; golden_key=' + goldenKey;
        return Object.assign({ 'Cookie': cookie, 'User-Agent': FUNPAY_UA }, extra || {});
    }

    // Загружает страницу offerEdit и достаёт свежий csrf_token + form_created_at.
    async function funpayFetchFormMeta(nodeId) {
        const url = FUNPAY_ORIGIN + '/lots/offerEdit?node=' + encodeURIComponent(nodeId);
        const resp = await makeGmRequest(requireUserscriptRequest(),
            { method: 'GET', url, headers: funpayHeaders({ 'Accept': 'text/html' }), timeout: FUNPAY_TO_OFFER_EDIT, anonymous: FUNPAY_ANON },
            (r, resolve, reject) => {
                if (r.status < 200 || r.status >= 300) return reject(createHttpError(r.status, r.responseText, 'FunPay', { url }));
                resolve(r.responseText || '');
            });
        const doc = new DOMParser().parseFromString(resp, 'text/html');
        if (funpayLooksLoggedOut(doc, resp)) throwError(FUNPAY_AUTH_ERROR);
        let csrf = '';
        const csrfInput = doc.querySelector('input[name="csrf_token"]');
        if (csrfInput) csrf = csrfInput.value || '';
        if (!csrf) {
            const appData = doc.querySelector('body[data-app-data]');
            if (appData) { try { csrf = (JSON.parse(appData.getAttribute('data-app-data')) || {})['csrf-token'] || ''; } catch (e) {} }
        }
        if (!csrf) throwError('Не удалось получить csrf_token FunPay');
        const createdInput = doc.querySelector('input[name="form_created_at"]');
        return { csrf, formCreatedAt: createdInput ? (createdInput.value || '') : String(Math.floor(Date.now() / 1000)) };
    }

    // Отправляет offerSave, возвращает { url, offerLink }.
    async function funpaySaveOffer(fieldsObj) {
        const params = new URLSearchParams();
        Object.keys(fieldsObj).forEach(k => { if (fieldsObj[k] != null) params.append(k, String(fieldsObj[k])); });
        FP_LOG('offerSave fields:', {
            server_id: fieldsObj['server_id'],
            type: fieldsObj['fields[type]'],
            skin: fieldsObj['fields[skin]'],
            summary_ru: fieldsObj['fields[summary][ru]'],
            summary_en: fieldsObj['fields[summary][en]'],
            price: fieldsObj['price'],
            amount: fieldsObj['amount'],
            images: fieldsObj['fields[images]']
        });
        const resp = await makeGmRequest(requireUserscriptRequest(),
            {
                method: 'POST', url: FUNPAY_ORIGIN + '/lots/offerSave',
                headers: funpayHeaders({
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json, text/javascript, */*; q=0.01'
                }),
                data: params.toString(),
                timeout: FUNPAY_TO_OFFER_SAVE, anonymous: FUNPAY_ANON
            },
            (r, resolve, reject) => {
                if (funpayDetectAuthFailure(r.status, r.responseText)) return reject(createError(FUNPAY_AUTH_ERROR));
                if (r.status < 200 || r.status >= 300) {
                    // FunPay кладёт текст ошибки валидации в ТЕЛО ответа даже при не-2xx
                    // (частый кейс: 428). Логируем всё целиком и пытаемся достать текст,
                    // чтобы понять, что именно не так, а не просто «offerSave 428».
                    const bodyRaw = r.responseText || '';
                    FP_LOG('offerSave HTTP ' + r.status + ' headers:', r.responseHeaders || '');
                    FP_LOG('offerSave HTTP ' + r.status + ' body:', bodyRaw.slice(0, 1000));
                    let bodyErr = '';
                    try { bodyErr = funpayExtractError(JSON.parse(bodyRaw || 'null')); } catch (e) {}
                    if (bodyErr) {
                        if (isFunpayUploadLimit(bodyErr)) return reject(createError(FUNPAY_ERR_UPLOAD_LIMIT, '', { funpayUploadLimit: true }));
                        return reject(createError(bodyErr, 'FunPay offerSave ' + r.status, { response: bodyRaw.slice(0, 500) }));
                    }
                    return reject(createHttpError(r.status, bodyRaw, 'FunPay offerSave', { response: bodyRaw.slice(0, 500) }));
                }
                resolve(r.responseText || '');
            });
        FP_LOG('offerSave resp:', String(resp).slice(0, 300));
        if (funpayDetectAuthFailure(200, resp)) throwError(FUNPAY_AUTH_ERROR);
        const json = parseJsonOrThrow(resp, 'Ответ FunPay не JSON');
        // Успех: FunPay всегда возвращает url созданного/сохранённого лота.
        if (json && json.url) return { url: json.url, raw: json };
        const errText = funpayExtractError(json);
        if (errText) {
            if (isFunpayUploadLimit(errText)) throwError(FUNPAY_ERR_UPLOAD_LIMIT, '', { funpayUploadLimit: true });
            throwError(errText, '', { response: String(resp).slice(0, 500) });
        }
        return { url: '', raw: json };
    }

    const nonEmpty = (v) => Array.isArray(v) ? v.length > 0 : (v && typeof v === 'object' ? Object.keys(v).length > 0 : !!v);

    // Достаёт человекочитаемый текст ошибки из ответа FunPay в любом формате:
    // {error:"..."} / {msg:"..."} / {errors:[...]} / {errors:{field:"текст"}} / errorFields.
    function funpayExtractError(json) {
        if (!json || typeof json !== 'object') return '';
        const parts = [];
        const push = v => { const s = String(v == null ? '' : v).trim(); if (s && s !== '0' && s !== '1' && s !== 'true' && s !== 'false') parts.push(s); };
        if (typeof json.error === 'string') push(json.error);
        push(json.msg);
        push(json.message);
        const collect = (val) => {
            if (!val) return;
            if (Array.isArray(val)) val.forEach(push);
            else if (typeof val === 'object') Object.values(val).forEach(collect);
            else push(val);
        };
        collect(json.errors);
        collect(json.errorFields);
        // Явный признак ошибки без текста (не пустой массив/объект и не 0).
        const hasErrorFlag = (json.error && json.error !== 0) || nonEmpty(json.errors) || nonEmpty(json.errorFields);
        if (!parts.length && hasErrorFlag) parts.push('FunPay вернул ошибку без описания');
        return Array.from(new Set(parts)).join('; ');
    }

    // Прямая ссылка на конкретный оффер FunPay по его id.
    const funpayOfferUrl = id => FUNPAY_ORIGIN + '/lots/offer?id=' + encodeURIComponent(id);

    // Читает страницу «мои лоты» подкатегории /lots/{nodeId}/trade и возвращает
    // Map<offerId, { href, desc, closed }> по всем офферам продавца (и активным,
    // и закрытым — закрытые имеют класс tc-item warning, жёлтые). offerId берётся
    // из data-offer (как в FunPayAPI; проверено на реальной /trade). На странице
    // href ведёт на offerEdit?node=..&offer=ID, поэтому публичную ссылку на лот
    // собираем сами через funpayOfferUrl (/lots/offer?id=ID).
    async function funpayFetchTradeOffers(nodeId) {
        const url = FUNPAY_ORIGIN + '/lots/' + encodeURIComponent(nodeId) + '/trade';
        const html = await makeGmRequest(requireUserscriptRequest(),
            { method: 'GET', url, headers: funpayHeaders({ 'Accept': 'text/html' }), timeout: FUNPAY_TO_TRADE, anonymous: FUNPAY_ANON },
            (r, resolve, reject) => {
                if (funpayDetectAuthFailure(r.status, r.responseText)) return reject(createError(FUNPAY_AUTH_ERROR));
                (r.status >= 200 && r.status < 300) ? resolve(r.responseText || '') : reject(createHttpError(r.status, r.responseText, 'FunPay trade', { url }));
            });
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (funpayLooksLoggedOut(doc, html)) throwError(FUNPAY_AUTH_ERROR);
        const map = new Map();
        // Новые лоты всегда вверху списка, поэтому берём только верхние FUNPAY_TRADE_TOP_N
        // (свежие) — этого достаточно и для diff новой ссылки, и для precheck дублей.
        Array.from(doc.querySelectorAll('a.tc-item')).slice(0, FUNPAY_TRADE_TOP_N).forEach(a => {
            let id = a.getAttribute('data-offer') || '';
            if (!id) { const m = (a.getAttribute('href') || '').match(/offer\?id=(\d+)/); if (m) id = m[1]; }
            if (!id) return;
            const descEl = a.querySelector('.tc-desc-text');
            map.set(String(id), {
                href: funpayOfferUrl(id),   // публичная ссылка на лот (href тут — offerEdit)
                desc: descEl ? descEl.textContent : '',
                closed: (a.getAttribute('class') || '').split(/\s+/).indexOf('warning') !== -1
            });
        });
        return map;
    }

    // Множество id офферов до публикации (для diff). Тихо возвращает пустой Set
    // при ошибке — тогда после публикации возьмём лучшее совпадение по описанию.
    async function funpaySnapshotOfferIds(nodeId) {
        try { return new Set((await funpayFetchTradeOffers(nodeId)).keys()); }
        catch (e) { FP_LOG('snapshot before failed:', e && e.message); return new Set(); }
    }

    // Определяет прямую ссылку на только что созданный офферов через diff
    // «до/после». Надёжно при последовательной очереди: каждый job снимает свой
    // beforeIds непосредственно перед offerSave, поэтому лоты разных аккаунтов
    // не перепутываются. Если новых id несколько (параллельные действия) —
    // выбираем тот, чьё описание совпадает с summaryText.
    async function funpayResolveNewOfferLink(nodeId, beforeIds, summaryText, fallbackListUrl) {
        let after;
        try { after = await funpayFetchTradeOffers(nodeId); }
        catch (e) { FP_LOG('snapshot after failed:', e && e.message); return { url: fallbackListUrl || '', offerId: '', exact: false }; }

        const before = beforeIds || new Set();
        const newIds = Array.from(after.keys()).filter(id => !before.has(id));
        const wanted = norm(summaryText);

        // 1) Точное совпадение по описанию среди НОВЫХ офферов.
        if (wanted) {
            const hit = newIds.find(id => norm(after.get(id).desc).indexOf(wanted) !== -1);
            if (hit) return { url: funpayOfferUrl(hit), offerId: hit, exact: true };
        }
        // 2) Ровно один новый оффер — это наш.
        if (newIds.length === 1) return { url: funpayOfferUrl(newIds[0]), offerId: newIds[0], exact: true };
        // 3) Новых нет/несколько без описания: ищем по описанию среди всех офферов.
        if (wanted) {
            const anyHit = Array.from(after.keys()).find(id => norm(after.get(id).desc).indexOf(wanted) !== -1);
            if (anyHit) return { url: funpayOfferUrl(anyHit), offerId: anyHit, exact: false };
        }
        // 4) Фолбэк: несколько новых без совпадения — берём первый новый, иначе список.
        if (newIds.length) return { url: funpayOfferUrl(newIds[0]), offerId: newIds[0], exact: false };
        return { url: fallbackListUrl || '', offerId: '', exact: false };
    }

    // --- Картинки: общий конвейер (скачать с LZT -> обработать -> залить) -----
    // Определяет image mime по сигнатуре байтов (LZT может отдать octet-stream).
    function sniffImageMime(bytes) {
        if (!bytes || bytes.length < 4) return '';
        const b = bytes;
        if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
        if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
        if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
        if (b[0] === 0x42 && b[1] === 0x4d) return 'image/bmp';
        if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return 'image/webp';
        return '';
    }

    const FP_LOG = (...a) => { try { console.log('[FunPay IMG]', ...a); } catch (e) {} };

    // Проверяет ArrayBuffer: возвращает { blob } или { blob:null, reason }.
    function funpayBufToImageBlob(buf, headerType) {
        if (!buf || (buf.byteLength != null && buf.byteLength === 0)) return { blob: null, reason: 'пустой ответ' };
        const bytes = new Uint8Array(buf);
        const ct = String(headerType || '').toLowerCase();
        const mime = ct.indexOf('image/') === 0 ? ct.split(';')[0].trim() : sniffImageMime(bytes);
        if (!mime) {
            const head = Array.from(bytes.slice(0, 16)).map(x => x.toString(16).padStart(2, '0')).join(' ');
            return { blob: null, reason: 'не изображение (ct=' + (ct || 'unknown') + ', bytes=' + bytes.length + ', head=' + head + ')' };
        }
        return { blob: new Blob([bytes], { type: mime }) };
    }

    // Скачивает картинку по ссылке LZT. Сначала page-context fetch (куки LZT точно
    // уходят), затем фоллбэк на GM_xmlhttpRequest. Таймауты раздельные и честные:
    // ожидание ответа (заголовков) — FUNPAY_TO_LZT_RESPONSE, скачивание тела —
    // FUNPAY_TO_LZT_DOWNLOAD. Возвращает { blob } | { blob:null, reason, timedOut }.
    async function funpayDownloadImage(url) {
        // 1) fetch в контексте страницы (мы уже на lzt.market, same-origin + cookies).
        try {
            const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
            // Фаза 1: ждём заголовки ответа не дольше RESPONSE.
            let respTimedOut = false;
            let phaseTimer = ctl ? setTimeout(() => { respTimedOut = true; ctl.abort(); }, FUNPAY_TO_LZT_RESPONSE) : 0;
            let resp;
            try { resp = await fetch(url, { credentials: 'include', headers: { 'Accept': 'image/*,*/*' }, signal: ctl ? ctl.signal : undefined }); }
            catch (e) {
                if (phaseTimer) clearTimeout(phaseTimer);
                if (respTimedOut) { FP_LOG('fetch response timeout', url); return { blob: null, reason: 'таймаут ответа', timedOut: true }; }
                throw e;
            }
            if (phaseTimer) clearTimeout(phaseTimer);
            const ct = resp.headers.get('content-type') || '';
            FP_LOG('fetch', url, '-> status', resp.status, 'ct', ct);
            if (resp.ok) {
                // Фаза 2: скачивание тела не дольше DOWNLOAD (на том же AbortController).
                let dlTimedOut = false;
                const dlTimer = ctl ? setTimeout(() => { dlTimedOut = true; ctl.abort(); }, FUNPAY_TO_LZT_DOWNLOAD) : 0;
                try {
                    const buf = await resp.arrayBuffer();
                    if (dlTimer) clearTimeout(dlTimer);
                    const res = funpayBufToImageBlob(buf, ct);
                    if (res.blob) { FP_LOG('fetch OK', url, res.blob.type, res.blob.size + 'b'); return res; }
                    FP_LOG('fetch not-image', url, res.reason);
                } catch (e) {
                    if (dlTimer) clearTimeout(dlTimer);
                    if (dlTimedOut) { FP_LOG('fetch download timeout', url); return { blob: null, reason: 'таймаут скачивания', timedOut: true }; }
                    throw e;
                }
            }
        } catch (e) {
            FP_LOG('fetch error', url, e && e.message);
        }
        // 2) фоллбэк: GM_xmlhttpRequest (единый timeout = ответ + скачивание).
        return new Promise(resolve => {
            requireUserscriptRequest()({
                method: 'GET', url, responseType: 'arraybuffer',
                timeout: FUNPAY_TO_LZT_RESPONSE + FUNPAY_TO_LZT_DOWNLOAD,
                headers: { 'Accept': 'image/*,*/*', 'Referer': 'https://lzt.market/' },
                onload: r => {
                    const headerType = (r.responseHeaders && (r.responseHeaders.match(/content-type:\s*([^\r\n;]+)/i) || [])[1] || '');
                    FP_LOG('GM', url, '-> status', r.status, 'ct', headerType);
                    if (r.status < 200 || r.status >= 300) { resolve({ blob: null, reason: 'HTTP ' + r.status }); return; }
                    const res = funpayBufToImageBlob(r.response, headerType);
                    if (res.blob) FP_LOG('GM OK', url, res.blob.type, res.blob.size + 'b');
                    else FP_LOG('GM not-image', url, res.reason);
                    resolve(res);
                },
                onerror: () => { FP_LOG('GM neterror', url); resolve({ blob: null, reason: 'сетевая ошибка' }); },
                ontimeout: () => { FP_LOG('GM timeout', url); resolve({ blob: null, reason: 'таймаут', timedOut: true }); }
            });
        });
    }

    const blobToImage = (blob) => new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { resolve(img); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(createError('Не удалось декодировать изображение')); };
        img.src = url;
    });

    const canvasToBlob = (canvas, type, quality) => new Promise((resolve) => {
        canvas.toBlob(b => resolve(b || null), type, quality);
    });

    // Вырезает прямоугольник картинки и кодирует так, чтобы влезть в лимит 7 МБ.
    // Всё локально (canvas.toBlob), без пробных загрузок на FunPay.
    // Малые площади -> PNG (без потерь). Крупные -> сразу JPEG (1 кодирование),
    // при необходимости одно понижение качества.
    async function funpayCropToBlob(img, y, h) {
        const w = img.naturalWidth;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';                 // фон под прозрачность (для JPEG)
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, y, w, h, 0, 0, w, h);
        // Оценка: несжатый PNG ~ w*h*4 байт. Если заведомо мелкая — PNG безопасен.
        if (w * h * 4 <= FUNPAY_IMG_MAX_BYTES) {
            const png = await canvasToBlob(canvas, 'image/png');
            if (png && png.size <= FUNPAY_IMG_MAX_BYTES) return png;
        }
        // Крупная — JPEG высокого качества, при перевесе одно понижение.
        let jpg = await canvasToBlob(canvas, 'image/jpeg', 0.85);
        if (jpg && jpg.size > FUNPAY_IMG_MAX_BYTES) jpg = await canvasToBlob(canvas, 'image/jpeg', 0.6);
        return (jpg && jpg.size <= FUNPAY_IMG_MAX_BYTES) ? jpg : null;
    }

    // Возвращает { blobs, reason }. Перекодирует и режет по вертикали на части
    // (каждая <= FUNPAY_IMG_MAX_SIDE по высоте, <= 7 МБ по размеру).
    async function funpayPrepareImage(blob) {
        if (!blob) return { blobs: [], reason: 'нет данных' };
        let img;
        try { img = await blobToImage(blob); } catch (e) { return { blobs: [], reason: 'не декодируется' }; }
        const w = img.naturalWidth, h = img.naturalHeight;
        try {
            if (w < FUNPAY_IMG_MIN_SIDE || h < FUNPAY_IMG_MIN_SIDE) return { blobs: [], reason: 'слишком маленькая ' + w + 'x' + h };
            if (w > FUNPAY_IMG_MAX_SIDE) return { blobs: [], reason: 'ширина > ' + FUNPAY_IMG_MAX_SIDE };
            const out = [];
            const heights = [];
            if (h <= FUNPAY_IMG_MAX_SIDE) {
                heights.push([0, h]);
            } else {
                const parts = Math.ceil(h / FUNPAY_IMG_MAX_SIDE);
                const sliceH = Math.ceil(h / parts);
                for (let i = 0; i < parts; i++) {
                    const y = i * sliceH;
                    const ph = Math.min(sliceH, h - y);
                    if (ph >= FUNPAY_IMG_MIN_SIDE) heights.push([y, ph]);
                }
            }
            let dropped = 0;
            for (const [y, ph] of heights) {
                const part = await funpayCropToBlob(img, y, ph);
                if (part) out.push(part); else dropped++;
            }
            return { blobs: out, reason: out.length ? (dropped ? ('часть ' + dropped + ' > 7 МБ') : '') : 'все части > 7 МБ' };
        } finally {
            if (img.src) URL.revokeObjectURL(img.src);
        }
    }

    // Загружает Blob на FunPay, возвращает fileId (число) или null.
    async function funpayUploadImage(blob) {
        const form = new FormData();
        const ext = (blob.type === 'image/jpeg') ? 'jpg' : 'png';
        form.append('file', blob, 'image.' + ext);
        form.append('file_id', '0');
        const resp = await makeGmRequest(requireUserscriptRequest(),
            {
                method: 'POST', url: FUNPAY_ORIGIN + '/file/addOfferImage',
                headers: funpayHeaders({ 'X-Requested-With': 'XMLHttpRequest', 'Accept': '*/*' }),
                data: form,
                timeout: FUNPAY_TO_FP_UPLOAD, anonymous: FUNPAY_ANON
            },
            (r, resolve, reject) => {
                const bodyRaw = r.responseText || '';
                // Авторизацию проверяем ПЕРВОЙ: неверный golden_key => FunPay отдаёт
                // 403 {"msg":"Необходимо авторизоваться."}. Иначе loose-регэксп лимита
                // мог ошибочно принять auth-ответ за «превышен объём загрузок».
                if (funpayDetectAuthFailure(r.status, bodyRaw)) {
                    FP_LOG('addOfferImage AUTH FAIL HTTP ' + r.status + ' body:', bodyRaw.slice(0, 300));
                    return reject(createError(FUNPAY_AUTH_ERROR));
                }
                if (r.status < 200 || r.status >= 300) {
                    FP_LOG('addOfferImage HTTP ' + r.status + ' body:', bodyRaw.slice(0, 300));
                    // Текст ошибки FunPay кладёт в JSON-тело — достаём аккуратно.
                    let bodyErr = '';
                    try { bodyErr = String((JSON.parse(bodyRaw || 'null') || {}).msg || (JSON.parse(bodyRaw || 'null') || {}).error || ''); } catch (e) {}
                    if (isFunpayUploadLimit(bodyErr)) return reject(createError(FUNPAY_ERR_UPLOAD_LIMIT, '', { funpayUploadLimit: true }));
                    if (bodyErr) return reject(createError(bodyErr, 'FunPay addOfferImage ' + r.status, { response: bodyRaw.slice(0, 300) }));
                    return reject(createHttpError(r.status, bodyRaw, 'FunPay addOfferImage'));
                }
                resolve(bodyRaw);
            });
        FP_LOG('addOfferImage resp:', String(resp).slice(0, 200));
        if (funpayDetectAuthFailure(200, resp)) throwError(FUNPAY_AUTH_ERROR);
        const json = parseJsonOrThrow(resp, 'Ответ FunPay (картинка) не JSON');
        const upErr = json.error || json.msg;
        if (upErr) {
            if (isFunpayUploadLimit(upErr)) throwError(FUNPAY_ERR_UPLOAD_LIMIT, '', { funpayUploadLimit: true });
            throwError(upErr);
        }
        const fileId = json.fileId != null ? json.fileId : json.file_id;
        return fileId != null ? String(fileId) : null;
    }

    // Полный конвейер: собирает fileId-ы картинок лота в порядке важности типов.
    // Фаза 1: скачивание+обрезка по очереди типов (приоритет), набор блобов до лимита 10.
    // Фаза 2: параллельная заливка (батчами) с сохранением исходного порядка.
    // Возвращает { ids: [...], diag: 'диагностика по типам' }.
    async function funpayCollectImageIds(adapter, itemId) {
        const types = adapter.imageTypes || [];
        if (!itemId || !types.length) return { ids: [], diag: 'нет itemId/типов' };
        const diag = [];
        const queue = []; // { blob, type } в порядке приоритета
        FP_LOG('collect start: itemId=' + itemId + ' types=' + types.join(','));
        for (const type of types) {
            if (queue.length >= FUNPAY_IMG_MAX_PER_LOT) { diag.push(type + ':лимит'); continue; }
            const url = 'https://lzt.market/' + itemId + '/image?type=' + encodeURIComponent(type);
            const dl = await funpayDownloadImage(url);
            // Fail-fast: медленный/неудачный ответ MARKET → лот не публикуем.
            if (!dl.blob) {
                if (dl.timedOut) throwError(FUNPAY_ERR_LZT_SLOW, '', { funpayImageError: true });
                diag.push(type + ':' + dl.reason);
                continue;
            }
            const prep = await funpayPrepareImage(dl.blob);
            FP_LOG('prepare', type, '-> parts', prep.blobs.length, prep.reason || '');
            if (!prep.blobs.length) { diag.push(type + ':' + prep.reason); continue; }
            let taken = 0;
            for (const blob of prep.blobs) {
                if (queue.length >= FUNPAY_IMG_MAX_PER_LOT) break;
                queue.push({ blob, type });
                taken++;
            }
            diag.push(type + ':' + taken);
        }

        // Фаза 2: параллельная заливка батчами, порядок сохраняем по индексам.
        // Fail-fast: таймаут/ошибка заливки хотя бы одной картинки → лот не публикуем.
        const results = new Array(queue.length).fill(null);
        for (let i = 0; i < queue.length; i += FUNPAY_UPLOAD_CONCURRENCY) {
            const batch = [];
            for (let j = i; j < Math.min(i + FUNPAY_UPLOAD_CONCURRENCY, queue.length); j++) {
                const idx = j;
                batch.push(funpayUploadImage(queue[idx].blob).then(id => { results[idx] = id || null; }));
            }
            try {
                await Promise.all(batch);
            } catch (e) {
                logScriptError('funpayUploadImage', e);
                FP_LOG('upload err (fail-fast):', getErrorMessage(e, 'ошибка'));
                // Ошибку превышения лимита пробрасываем как есть (сохраняем флаг
                // funpayUploadLimit), иначе — обобщаем как «долгая загрузка».
                if (e && e.extra && e.extra.funpayUploadLimit) throw e;
                throwError(FUNPAY_ERR_FP_SLOW, '', { funpayImageError: true });
            }
        }
        // Каждая картинка обязана получить fileId — иначе публикация без части картинок.
        if (results.some(id => !id)) throwError(FUNPAY_ERR_FP_SLOW, '', { funpayImageError: true });
        const ids = results.slice(0, FUNPAY_IMG_MAX_PER_LOT);
        FP_LOG('collect done: ids=' + ids.length, 'diag=' + diag.join(', '));
        return { ids, diag: diag.join(', ') };
    }

    // Делает англ. описание валидным для FunPay: убирает кириллицу и прочий
    // не-латинский текст. Если осмысленного текста не осталось — «N SKINS».
    function sanitizeFunpayEnSummary(text, count) {
        let s = String(text || '');
        if (/[а-яё]/i.test(s)) {
            // Разбиваем по разделителю и выкидываем сегменты с кириллицей.
            s = s.split('|').map(x => x.trim()).filter(x => x && !/[а-яё]/i.test(x)).join(' | ');
        }
        s = s.replace(/\s{2,}/g, ' ').replace(/^\s*\|\s*|\s*\|\s*$/g, '').trim();
        // Осталось что-то латинское и достаточной длины — годится.
        if (s && /[a-z0-9]/i.test(s)) return s.toUpperCase();
        const n = Math.max(0, count | 0);
        return (n > 0 ? (n + ' SKINS') : 'ACCOUNT');
    }

    // --- Сборка полей и публикация одного оффера ----------------------------
    function funpayBuildOfferFields(adapter, catCfg, meta, data, ctx, imageIds) {
        const title = ctx.title;
        // Название на FunPay (краткое описание). Пусто => авто-название. Итог всегда КАПСОМ.
        // Лимит 100 символов: лишние редкие скины отбрасываются с конца (не режем слова).
        // Адаптеры с summaryFromTitle (Valorant) используют готовый title из buildTitle,
        // т.к. общий шаблон {count}|{rare} не знает про агентов/ранг.
        const summaryRu = ((catCfg.summaryRu && applyFunpayTemplate(catCfg.summaryRu, ctx, 'ru', FUNPAY_TITLE_MAX)) || title).toUpperCase();
        let summaryEn = ((catCfg.summaryEn && applyFunpayTemplate(catCfg.summaryEn, ctx, 'en', FUNPAY_TITLE_MAX)) || summaryRu).toUpperCase();
        // FunPay запрещает кириллицу в англ. описании. Чистим не-латиницу; если после
        // очистки почти пусто (напр. редкие имена были на кириллице) — оставляем
        // только «N SKINS» (count-часть), чтобы описание было валидным английским.
        summaryEn = sanitizeFunpayEnSummary(summaryEn, ctx.count);
        const descRu = applyFunpayTemplate(catCfg.descRu, ctx, 'ru');
        const descEn = applyFunpayTemplate(catCfg.descEn, ctx, 'en');
        const price = String(ctx.price || FUNPAY_DEFAULT_PRICE).replace(',', '.').trim();
        const fields = {
            'csrf_token': meta.csrf,
            'form_created_at': meta.formCreatedAt,
            'offer_id': '0',
            'node_id': adapter.nodeId,        // дефолт из адаптера
            'location': 'trade',
            'deleted': '',
            'fields[summary][ru]': summaryRu,
            'fields[summary][en]': summaryEn,
            'fields[desc][ru]': descRu,
            'fields[desc][en]': descEn,
            'fields[images]': (imageIds || []).join(','),
            'price': price,
            'amount': adapter.defaultAmount || '1',  // дефолт из адаптера
            'active': 'on'
        };
        return Object.assign(fields, adapter.extraFields(data, catCfg));
    }

    async function funpayPublishOffer(gameKey, job, isRetry) {
        const adapter = FUNPAY_ADAPTERS[gameKey];
        if (!adapter) throwError('Неизвестная категория FunPay: ' + gameKey);
        const catCfg = funpayCatCfg(gameKey);

        // Данные снимаются со страницы в момент постановки в очередь (снапшот в job),
        // чтобы публикация переживала F5/навигацию.
        const data = (job && job.data) ? job.data : adapter.collect();
        const lztUrl = (job && job.lztUrl) || getLztItemUrl();
        const price = FUNPAY_DEFAULT_PRICE; // цена по умолчанию (поле убрано из UI)
        // adapter+data в ctx: движок шаблонов сможет взять доп. плейсхолдеры адаптера.
        const baseCtx = { count: data.count, rareNames: data.rareNames, price, lztUrl, adapter, data };
        const title = adapter.buildTitle(data, baseCtx);
        if (!title) throwError('Не удалось собрать название лота');
        const ctx = Object.assign({ title }, baseCtx);

        // Защита от дублей при подхвате осиротевшей задачи: если предыдущая вкладка
        // умерла между offerSave и снятием job (isRetry), возможно лот уже создан.
        // Проверяем /trade по описанию ДО повторной публикации.
        if (isRetry) {
            const summaryPre = ((catCfg.summaryRu && applyFunpayTemplate(catCfg.summaryRu, ctx, 'ru', FUNPAY_TITLE_MAX)) || title).toUpperCase();
            try {
                const offers = await funpayFetchTradeOffers(adapter.nodeId);
                const wanted = norm(summaryPre);
                const existingId = wanted && Array.from(offers.keys()).find(id => norm(offers.get(id).desc).indexOf(wanted) !== -1);
                if (existingId) {
                    return {
                        title, summaryText: summaryPre, funpayUrl: funpayOfferUrl(existingId), lztUrl,
                        warning: 'Лот, возможно, уже был создан прошлой попыткой — публикация не повторялась, проверьте вручную'
                    };
                }
            } catch (e) { FP_LOG('retry precheck failed:', e && e.message); }
        }

        // Картинки: скачиваем с LZT, обрабатываем и заливаем на FunPay (лимит 10).
        // Fail-fast: любая ошибка/таймаут скачивания или заливки прерывает публикацию
        // (ошибка пробрасывается наверх — лот НЕ создаётся, попадает в историю/тост).
        const itemId = (job && job.itemId) || getLztItemId();
        updateFunpayPublishingToast('Загрузка картинок…');
        const imgRes = await funpayCollectImageIds(adapter, itemId);
        const imageIds = imgRes.ids;
        if (!imageIds.length) throwError('Картинки не найдены — лот не опубликован (' + (imgRes.diag || '—') + ')');

        updateFunpayPublishingToast('Создание лота…');
        const meta = await funpayFetchFormMeta(adapter.nodeId);
        const fields = funpayBuildOfferFields(adapter, catCfg, meta, data, ctx, imageIds);
        const summaryText = fields['fields[summary][ru]'];

        // Снимок id офферов ДО сохранения — сразу перед offerSave, чтобы diff
        // относился именно к этому лоту (очередь строго последовательная).
        const beforeIds = await funpaySnapshotOfferIds(adapter.nodeId);
        const result = await funpaySaveOffer(fields);
        updateFunpayPublishingToast('Получение ссылки на лот…');
        // FunPay не отдаёт прямую ссылку на оффер — вычисляем через diff /trade.
        const link = await funpayResolveNewOfferLink(adapter.nodeId, beforeIds, summaryText, result.url);

        const warnings = [];
        if (data.count === 0) warnings.push('На странице LZT не найдено скинов (count=0)');
        if (link.url && !link.exact) warnings.push('Ссылка на лот определена приблизительно — проверьте вручную');
        return { title, summaryText, funpayUrl: link.url || result.url, lztUrl, warning: warnings.join('; ') };
    }

    // --- Последовательная очередь с межвкладочным локом (переживает F5) ------
    const loadFunpayQueue = () => loadStoredArray(FUNPAY_QUEUE_LS_KEY);
    const saveFunpayQueue = arr => saveStoredArray(FUNPAY_QUEUE_LS_KEY, arr);
    const FUNPAY_TAB_ID = 'tab_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    let funpayQueueRunning = false;
    let funpayCancelRequested = false;

    // Полная отмена: очищает очередь во всех вкладках и останавливает обработку
    // между задачами. Уже отправленный на FunPay запрос текущего лота прервать
    // нельзя (он может завершиться на стороне FunPay), но следующие лоты не пойдут.
    function funpayCancelAll() {
        funpayCancelRequested = true;
        saveFunpayQueue([]);            // очистить очередь (синхронизируется в другие вкладки)
        hideFunpayPublishingToast();
        updateFunpayButtons();
        showThemeToast('Публикация отменена, очередь очищена');
    }

    function funpayReadLock() {
        const lock = loadStoredObject(FUNPAY_LOCK_LS_KEY);
        if (lock && lock.at && (Date.now() - lock.at) < FUNPAY_LOCK_TTL) return lock;
        return null;
    }
    function funpayAcquireLock() {
        const existing = funpayReadLock();
        if (existing && existing.tab !== FUNPAY_TAB_ID) return false;
        saveStoredJson(FUNPAY_LOCK_LS_KEY, { tab: FUNPAY_TAB_ID, at: Date.now() });
        // Проверка от гонки: перечитываем.
        const check = loadStoredObject(FUNPAY_LOCK_LS_KEY);
        return check && check.tab === FUNPAY_TAB_ID;
    }
    const funpayRenewLock = () => { if (funpayReadLock()) saveStoredJson(FUNPAY_LOCK_LS_KEY, { tab: FUNPAY_TAB_ID, at: Date.now() }); };
    function funpayReleaseLock() {
        const lock = loadStoredObject(FUNPAY_LOCK_LS_KEY);
        if (!lock || lock.tab === FUNPAY_TAB_ID) storageRemove(FUNPAY_LOCK_LS_KEY);
    }

    function funpayEnqueue(job) {
        const queue = loadFunpayQueue();
        queue.push(Object.assign({ id: 'job_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), at: Date.now() }, job));
        saveFunpayQueue(queue);
        funpaySyncPublishingToast(); // показать постоянный тост сразу на этой вкладке
        funpayProcessQueue();
    }

    async function funpayProcessQueue() {
        if (funpayQueueRunning) return;
        if (!loadFunpayQueue().length) return;
        if (!funpayAcquireLock()) return; // другая вкладка публикует
        funpayQueueRunning = true;
        funpayCancelRequested = false;  // новый прогон — сбрасываем флаг отмены
        // Heartbeat: держим лок «живым» на отдельном таймере — он тикает даже пока
        // мы ждём долгий сетевой запрос (до 30с), поэтому другая вкладка не заберёт
        // очередь у работающей вкладки. Первый renew — сразу.
        funpayRenewLock();
        const lockTimer = setInterval(funpayRenewLock, FUNPAY_LOCK_RENEW);
        try {
            while (true) {
                if (funpayCancelRequested) break;   // отмена до старта следующего лота
                const queue = loadFunpayQueue();
                if (!queue.length) break;
                const job = queue[0];
                // Счётчик попыток персистим ДО публикации: если эта вкладка умрёт
                // между offerSave и снятием job, вкладка-преемник увидит attempts>0
                // и сначала проверит, не создан ли лот уже (защита от дублей).
                const priorAttempts = job.attempts | 0;
                job.attempts = priorAttempts + 1;
                if (queue[0].id === job.id) { queue[0] = job; saveFunpayQueue(queue); }
                updateFunpayButtons();
                // Постоянный тост процесса: висит до успеха/ошибки, закрыть нельзя.
                const remaining = queue.length;
                showFunpayPublishingToast('Публикация лота…' + (remaining > 1 ? (' (в очереди ещё ' + (remaining - 1) + ')') : ''));
                try {
                    const res = await funpayPublishOffer(job.gameKey, job, priorAttempts > 0);
                    addFunpayHistory({
                        status: res.warning ? 'warning' : 'ok',
                        gameKey: job.gameKey,
                        title: res.title,
                        funpayUrl: res.funpayUrl,
                        lztUrl: res.lztUrl || job.lztUrl,
                        message: res.warning || '',
                        // Пометка «проверьте англ. название» — только если EN-название реально
                        // содержит транслит кириллических редких (та же логика, что у тоста).
                        checkTitle: shouldWarnFunpayTranslit(job.gameKey, job.data)
                    });
                    showThemeToast(res.warning ? ('FunPay: опубликовано с предупреждением') : ('FunPay: лот опубликован'));
                } catch (e) {
                    logScriptError('funpayPublish', e);
                    const isUploadLimit = !!(e && e.extra && e.extra.funpayUploadLimit);
                    addFunpayHistory({
                        status: 'error',
                        gameKey: job.gameKey,
                        title: job.title || '',
                        funpayUrl: '',
                        lztUrl: job.lztUrl || '',
                        message: isUploadLimit ? FUNPAY_ERR_UPLOAD_LIMIT : formatErrorText(e, 'Ошибка публикации')
                    });
                    // Все ошибки Uploader — незакрываемый тост с «Понятно» (не запоминается,
                    // при следующей ошибке покажется снова).
                    showNoticeToast({
                        key: 'funpay-error', isError: true, title: 'FunPay',
                        body: isUploadLimit ? FUNPAY_ERR_UPLOAD_LIMIT : formatErrorText(e, 'Ошибка публикации')
                    });
                }
                // Отмена во время публикации: очередь уже очищена — просто выходим.
                if (funpayCancelRequested) break;
                // Снимаем выполненную задачу (перечитываем: очередь могла измениться).
                const after = loadFunpayQueue();
                if (after.length && after[0].id === job.id) { after.shift(); saveFunpayQueue(after); }
                funpaySyncPublishingToast(); // скрыть тост, если очередь опустела; иначе оставить
                await wait(1500);
            }
        } finally {
            clearInterval(lockTimer);
            funpayQueueRunning = false;
            funpayReleaseLock();
            hideFunpayPublishingToast(); // страховка: очередь опустела/лок потерян
            updateFunpayButtons();
        }
    }

    // --- Кнопка публикации у родных кнопок маркета ---------------------------
    function funpayQueueHasLzt(lztUrl) {
        return loadFunpayQueue().some(j => j.lztUrl === lztUrl);
    }
    function updateFunpayButtons() {
        const btn = document.getElementById('rareFunpayBtn');
        if (!btn) return;
        const busy = funpayQueueRunning || funpayReadLock();
        const inQueue = funpayQueueHasLzt(getLztItemUrl());
        btn.disabled = !!inQueue;
        btn.title = inQueue ? 'Лот уже в очереди публикации FunPay' : 'Опубликовать этот аккаунт на FunPay';
        btn.classList.toggle('is-busy', !!busy);
    }

    function ensureFunpayButton() {
        const game = detectGame();
        if (!FUNPAY_ADAPTERS[game] || !FUNPAY_ADAPTERS[game].ready) {
            const stale = document.getElementById('rareFunpayBtn');
            if (stale) stale.remove();
            return;
        }
        const anchor = document.getElementById('rareAutoTitleBtn')
            || document.querySelector('.AiTitleButton[data-item-id]')
            || document.querySelector('.Editable.EditableValue[data-key="title"]');
        if (!anchor || document.getElementById('rareFunpayBtn')) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'rareFunpayBtn';
        btn.className = 'rareFunpayBtn';
        const accent = CUSTOM.accentColor || DEFAULT_CUSTOM.accentColor;
        btn.style.setProperty('--rare-fp-rgb', hexToRgbList(accent));
        btn.style.setProperty('--rare-fp-bg', CUSTOM.modalBg || DEFAULT_CUSTOM.modalBg);
        btn.style.setProperty('--rare-fp-fg', getThemeAccentForeground(accent, CUSTOM.modalBg || DEFAULT_CUSTOM.modalBg));
        btn.innerHTML = '<span class="rareFunpayBtnIcon">' + funpaySvg() + '</span><span class="rareFunpayBtnTxt">FunPay</span>';
        btn.addEventListener('click', () => funpayTriggerPublish());
        anchor.parentNode.insertBefore(btn, anchor.nextSibling);
        updateFunpayButtons();
    }

    // Общий триггер публикации: снимает данные и ставит лот в очередь.
    function funpayTriggerPublish() {
        const game = detectGame();
        if (!FUNPAY_ADAPTERS[game] || !FUNPAY_ADAPTERS[game].ready) { showNoticeToast({ key: 'funpay-error', isError: true, title: 'FunPay', body: 'Эта категория недоступна для публикации' }); return; }
        if (!String(FUNPAY.goldenKey || '').trim()) { openSettings(CATEGORIES.fortnite, 'funpay'); showNoticeToast({ key: 'funpay-error', isError: true, title: 'FunPay', body: 'Укажите golden_key во вкладке Uploader' }); return; }
        const lztUrl = getLztItemUrl();
        if (funpayQueueHasLzt(lztUrl)) return;
        let data;
        try { data = FUNPAY_ADAPTERS[game].collect(); }
        catch (e) { showNoticeToast({ key: 'funpay-error', isError: true, title: 'FunPay', body: formatErrorText(e, 'Не удалось собрать данные LZT') }); return; }
        funpayEnqueue({ gameKey: game, lztUrl, itemId: getLztItemId(), data });
        showThemeToast('Добавлено в очередь публикации FunPay');
        // Valorant: уведомление о транслите EN-названий показываем ТОЛЬКО если реально
        // используется список редких {rare} в EN-шаблоне И среди найденных редких есть
        // кириллица (иначе транслитерировать нечего и предупреждать не о чем).
        if (game === 'valorant' && shouldWarnFunpayTranslit(game, data) && !isHintDismissed(FUNPAY_EN_TRANSLIT_HINT_ID)) {
            showNoticeToast({
                key: FUNPAY_EN_TRANSLIT_HINT_ID,
                title: 'FunPay',
                body: 'Английские названия редких скинов Valorant вставлены транслитом (латиницей) — FunPay не принимает кириллицу. Проверьте и при необходимости поправьте английское название лота вручную.',
                onAck: () => dismissHint(FUNPAY_EN_TRANSLIT_HINT_ID)
            });
        }
        updateFunpayButtons();
    }

    // Нужно ли предупреждать о транслите EN-названий: (1) в EN-шаблоне названия или
    // описания есть плейсхолдер {rare}; (2) реально найдены редкие; (3) среди их имён
    // есть кириллица (только её транслитерируем). Иначе предупреждать не о чем.
    function shouldWarnFunpayTranslit(game, data) {
        const rareNames = (data && data.rareNames) || [];
        if (!rareNames.length) return false;
        const hasCyrillic = rareNames.some(n => /[а-яё]/i.test(String(n || '')));
        if (!hasCyrillic) return false;
        const catCfg = (loadFunpayUploader().categories || {})[game] || {};
        const enTemplates = [catCfg.summaryEn, catCfg.descEn, FUNPAY_DEFAULT_TITLE];
        return enTemplates.some(t => /\{rare\}/.test(String(t || '')));
    }


    const funpaySvg = () => '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3h18v4H3z"/><path d="M6 7v14"/><path d="M6 13h10"/><path d="M6 9h12"/></svg>';

    // Перезапуск очереди после F5 и синхронизация между вкладками.
    let _funpayWatchersReady = false;
    function ensureFunpayWatchers() {
        if (_funpayWatchersReady) return;
        _funpayWatchersReady = true;
        storageWatch(FUNPAY_QUEUE_LS_KEY, () => { updateFunpayButtons(); funpaySyncPublishingToast(); funpayProcessQueue(); });
        storageWatch(FUNPAY_LOCK_LS_KEY, () => { updateFunpayButtons(); funpaySyncPublishingToast(); });
        storageWatch(FUNPAY_HISTORY_LS_KEY, () => refreshFunpayHistoryView());
        setTimeout(() => { funpaySyncPublishingToast(); funpayProcessQueue(); }, 800);
        // Takeover-поллинг: если вкладка-владелец умерла (закрыта/зависла), её лок
        // протухнет за FUNPAY_LOCK_TTL. Эта простаивающая вкладка периодически
        // пробует подхватить осиротевшую очередь. funpayProcessQueue сам проверит
        // лок и ничего не сделает, если публикует другая живая вкладка.
        setInterval(() => {
            if (funpayQueueRunning) return;
            if (!loadFunpayQueue().length) return;
            if (funpayReadLock()) return; // есть живой владелец — не вмешиваемся
            funpayProcessQueue();
        }, FUNPAY_TAKEOVER_POLL);
    }

    function refreshFunpayHistoryView() {
        const modal = document.getElementById('rareModal');
        if (!modal) return;
        const host = modal.querySelector('.rareFunpayHistory');
        if (host && host._render) host._render();
    }

    // ─── Авто-заполнение страницы добавления товара (/add) ────────────────────
    // Для ссылок вида https://lzt.market/{game}/item/add автоматически проставляем
    // дефолтные название (из слова категории, напр. "STEAM") и цену 99999, если
    // поля пусты. Значения вписываются в реальные поля формы (title_ru/title_en/
    // price из add.html) с эмуляцией input/change, чтобы фреймворк LZT их принял.
    const ADD_PAGE_DEFAULT_PRICE = FUNPAY_DEFAULT_PRICE; // 99999
    let _addPageAutofilled = false;

    function setNativeInputValue(input, value) {
        if (!input) return;
        try {
            const proto = Object.getPrototypeOf(input);
            const desc = Object.getOwnPropertyDescriptor(proto, 'value');
            if (desc && desc.set) desc.set.call(input, value); else input.value = value;
        } catch (e) { input.value = value; }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Определяет «слово» категории для дефолтного названия.
    function getAddPageCategoryWord() {
        const titleInput = document.querySelector('input[name="title_ru"], #ctrl_title');
        const dataCat = titleInput && titleInput.getAttribute('data-category');
        if (dataCat && dataCat.trim()) return dataCat.trim();
        // Фолбэк: из URL /{game}/item/add берём {game}.
        const m = location.pathname.match(/\/([^/]+)\/item\/add/i);
        if (m && m[1]) return decodeURIComponent(m[1]);
        return 'ACCOUNT';
    }

    function isAddPage() {
        return /\/item\/add(\/|$|\?)/i.test(location.pathname + location.search)
            || /\/add(\/|$|\?)/i.test(location.pathname) && !!document.querySelector('input[name="title_ru"], #ctrl_title');
    }

    function autofillAddPage() {
        if (_addPageAutofilled) return;
        if (!isAddPage()) return;
        const titleRu = document.querySelector('input[name="title_ru"], #ctrl_title');
        const titleEn = document.querySelector('input[name="title_en"]');
        const price = document.querySelector('input[name="price"], .ItemAddOrEditForm--price');
        if (!titleRu && !price) return; // форма ещё не отрисована
        _addPageAutofilled = true;

        const word = getAddPageCategoryWord().toUpperCase();
        if (titleRu && !String(titleRu.value || '').trim()) setNativeInputValue(titleRu, word);
        if (titleEn && !String(titleEn.value || '').trim()) setNativeInputValue(titleEn, word);
        if (price && !String(price.value || '').trim()) setNativeInputValue(price, ADD_PAGE_DEFAULT_PRICE);
        showThemeToast('Автозаполнено: ' + word + ' • ' + ADD_PAGE_DEFAULT_PRICE);
    }

    function ensureAddPageWatcher() {
        if (!isAddPage()) return;
        autofillAddPage();
        if (_addPageAutofilled) return;
        // Форма может подгружаться асинхронно — ждём появления полей.
        let tries = 0;
        const t = setInterval(() => {
            tries++;
            autofillAddPage();
            if (_addPageAutofilled || tries > 40) clearInterval(t);
        }, 300);
    }

    function run() {
        injectStyles();
        ensureAddPageWatcher();
        ensureFloatingButton();
        ensureFunpayWatchers();
        ensurePublishedAgeWatcher();
        rebuild();
        queuePublishedAgeUpdate();
        rareObserver = new MutationObserver(records => {
            if (records.some(mutationTouchesRareSource)) scheduleRebuild();
        });
        rareObserver.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { if (rareObserver) rareObserver.disconnect(); rareObserver = null; }, 10000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', run);
    } else {
        run();
    }
})();
