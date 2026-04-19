// NetrunnerDB simplified extension - Content Script
console.log('[NetrunnerDB Extension] Loading...');

// 全局變量來存儲用戶設置（支持 Runner/Corp 分別設置）
let columnSettings = {
    // Runner 欄位
    runner_cost: true,
    runner_memory_cost: true,
    runner_strength: true,
    runner_influence: true,
    runner_type: true,
    runner_faction: true,
    // Corp 欄位
    corp_cost: true,
    corp_trash_cost: true,
    corp_agenda_point: true,
    corp_influence: true,
    corp_type: true,
    corp_faction: true
};
const defaultOrder = {
    runner: ['indeck', 'title', 'cost', 'memory_cost', 'strength', 'faction_cost', 'type_code', 'faction_code'].map(id => ({ id, visible: true })),
    corp: ['indeck', 'title', 'cost', 'trash_cost', 'faction_cost', 'type_code', 'faction_code'].map(id => ({ id, visible: true }))
};

const DEFAULT_LANGUAGE = 'zh';
const TRANSLATIONS = {
    zh: {
        customFilterTitle: '自定义筛选器 (自定义按钮)',
        customOr: '自定义 (OR)',
        customAnd: '自定义 (AND)',
        labelMap: {
            indeck: 'Quantity', title: 'Name', cost: 'Cost',
            memory_cost: 'Mem.', trash_cost: 'Trash',
            strength: 'Str.', faction_cost: 'Inf.',
            type_code: 'Type', faction_code: 'Faction'
        }
    },
    en: {
        customFilterTitle: 'Custom filter (custom buttons)',
        customOr: 'Custom (OR)',
        customAnd: 'Custom (AND)',
        labelMap: {
            indeck: 'Quantity', title: 'Name', cost: 'Cost',
            memory_cost: 'Mem.', trash_cost: 'Trash',
            strength: 'Str.', faction_cost: 'Inf.',
            type_code: 'Type', faction_code: 'Faction'
        }
    }
};
let currentLanguage = DEFAULT_LANGUAGE;
let LABEL_MAP = TRANSLATIONS[currentLanguage].labelMap;

function loadContentLanguage(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(['language'], function (result) {
            if (result.language && TRANSLATIONS[result.language]) {
                currentLanguage = result.language;
            } else {
                currentLanguage = DEFAULT_LANGUAGE;
            }
            LABEL_MAP = TRANSLATIONS[currentLanguage].labelMap;
            if (callback) callback();
        });
        chrome.storage.onChanged.addListener(function (changes, areaName) {
            if (areaName === 'sync' && changes.language && TRANSLATIONS[changes.language.newValue]) {
                currentLanguage = changes.language.newValue;
                LABEL_MAP = TRANSLATIONS[currentLanguage].labelMap;
            }
        });
    } else if (callback) {
        callback();
    }
}

const DEFAULT_BTNS = {
    runnerAND: [{ name: "Stealth", value: "x:Stealth", enabled: true }, { name: "Run", value: "s:Run", enabled: true }],
    runnerOR: [{ name: "AI", value: "s:AI", enabled: true }, { name: "Decoder", value: "s:Decoder", enabled: true }, { name: "Killer", value: "s:Killer", enabled: true }, { name: "Fracter", value: "s:Fracter", enabled: true }],
    corpAND: [{ name: "Liability", value: "s:Liability", enabled: true }, { name: "Black Ops", value: "s:Black Ops", enabled: true }, { name: "Gray Ops", value: "s:Gray Ops", enabled: true }],
    corpOR: [{ name: "Barrier", value: "s:Barrier", enabled: true }, { name: "Code Gate", value: "s:Code Gate", enabled: true }, { name: "Sentry", value: "s:Sentry", enabled: true }]
};
function insertEmptyFilterRow() {

    const buildSearchButtons = () => {
        // --- 1. 定义 HTML 结构 ---
        // 这里使用模板字符串来定义新的 HTML 结构
        const newSearchButtonsHTML = `
       <div class="row search-buttons">
    <div class="col-sm-6" style="margin-bottom:10px">
        <div id="faction_code" class="filter btn-group btn-group-justified" data-toggle="buttons"></div>
    </div>
    <div class="col-sm-6" style="margin-bottom:10px">
        <div id="type_code" class="filter btn-group btn-group-justified" data-toggle="buttons"></div>
    </div>

    <div class="col-sm-12" id="custom-filter-toggle" style="cursor:pointer; margin-bottom:5px; color:#337ab7; font-size:12px; display:flex; align-items:center;">
        <span class="caret" style="margin-right:5px; transition: transform 0.2s;" id="custom-filter-caret"></span>
        <strong>${TRANSLATIONS[currentLanguage].customFilterTitle}</strong>
    </div>

    <div id="custom-filter-container" style="display: block;">
        <div class="col-sm-12" style="margin-bottom:10px; display: flex; align-items: center;">
            <div style="width: 80px; flex-shrink: 0; font-weight: bold; color: #666; font-size: 12px;">${TRANSLATIONS[currentLanguage].customOr}</div>
            <div id="my_code_or" class="newfilter btn-group btn-group-justified" data-toggle="buttons" style="flex-grow: 1;"></div>
        </div>

        <div class="col-sm-12" style="margin-bottom:10px; display: flex; align-items: center;">
            <div style="width: 80px; flex-shrink: 0; font-weight: bold; color: #666; font-size: 12px;">${TRANSLATIONS[currentLanguage].customAnd}</div>
            <div id="my_code_and" class="newfilter btn-group btn-group-justified" data-toggle="buttons" style="flex-grow: 1;"></div>
        </div>
    </div>
</div>
    `;
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = newSearchButtonsHTML;
        const newRowElement = tempContainer.firstElementChild;
        // --- 2. 查找目标元素 (替换 $('.row.search-buttons')) ---
        const existingSearchButtonsRow = document.querySelector('.row.search-buttons');

        // --- 3. 检查元素并插入新的结构 ---
        if (existingSearchButtonsRow) {
            existingSearchButtonsRow.replaceWith(newRowElement);

            // 重新获取插入后的 DOM 元素
            const toggleBtn = document.getElementById('custom-filter-toggle');
            const container = document.getElementById('custom-filter-container');
            const caret = document.getElementById('custom-filter-caret');

            if (toggleBtn && container) {
                toggleBtn.addEventListener('click', () => {
                    if (container.style.display === 'none') {
                        container.style.display = 'block';
                        if (caret) caret.style.transform = 'rotate(0deg)';
                    } else {
                        container.style.display = 'none';
                        if (caret) caret.style.transform = 'rotate(-90deg)';
                    }
                });
            }
            console.log('✅ New filter structure inserted and events bound successfully.');
        } else {
            console.error("Unable to extract a valid Element from the temporary container. Please check the HTML structure.");
        }
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.sync.get(['language'], function (result) {
            if (result.language && TRANSLATIONS[result.language]) {
                currentLanguage = result.language;
                LABEL_MAP = TRANSLATIONS[currentLanguage].labelMap;
            }
            buildSearchButtons();
        });
    } else {
        buildSearchButtons();
    }
}


function modifycollection(identityType) {

    const collectionElement = document.getElementById('collection');
    if (!collectionElement) return setTimeout(() => modifycollection(identityType), 100);

    const tableHead = collectionElement.querySelector('thead');
    // 從 chrome.storage 獲取最新的排序設定

    const order = window.customColumnOrder[identityType];
    if (tableHead && order) {
        let headerHtml = '<tr>';
        order.forEach(item => {
            // 只有勾選 visible 的才產生表頭
            if (item.visible) {
                headerHtml += `<th><a href="#" data-sort="${item.id}">${LABEL_MAP[item.id] || item.id}</a></th>`;
            }
        });
        headerHtml += '</tr>';
        tableHead.innerHTML = headerHtml;
        console.log(`[Content.js] ${order} header render complete`);

        console.log(`[Content.js] ${identityType} header render complete`);
    }

}


// 注入脚本到页面上下文
function injectScript(columnOrder) {
    const script = document.createElement('script');
    const settingsStr = encodeURIComponent(JSON.stringify(columnOrder));
    script.src = chrome.runtime.getURL('inject.js') + '?order=' + settingsStr;

    (document.head || document.documentElement).appendChild(script);

    script.onload = function () {
        console.log('[NetrunnerDB Extension] inject.js injected successfully');
        script.remove();
    };

    script.onerror = function () {
        console.error('[NetrunnerDB Extension] inject.js injection failed');
    };
    window.customColumnOrder = columnOrder;
}

// 等待页面加载完成后初始化
function initExtension() {
    loadContentLanguage(() => {
        console.log('[NetrunnerDB Extension] Initializing...');

        const currentPath = window.location.pathname;
        console.log('[NetrunnerDB Extension] Current path:', currentPath);

        if (currentPath.includes('/deck/edit/') || currentPath.includes('/deck/build/')) {
            console.log('[NetrunnerDB Extension] Detected deck edit page');

            insertEmptyFilterRow();

            // 無論頁面狀態如何，都先確保 DOM 載入後再注入和嘗試修改
            if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.sync.get(['columnOrder'], function (result) {
                    // 更新所有設置，使用默認值
                    const columnOrder = result.columnOrder || defaultOrder;
                    console.log('[NetrunnerDB Extension] Column settings loaded:', columnOrder);

                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', injectScript(columnOrder));
                        // 在 DOM 載入後，開始檢查 collection 元素是否出現
                    } else {
                        injectScript(columnOrder);
                        // 如果已經載入完成，直接開始檢查
                        const deckElement = document.getElementById('deck');

                        if (deckElement) {
                            deckElement.classList.remove('col-md-6');
                            deckElement.classList.add('col-md-5');
                            const neighborElement = deckElement.nextElementSibling;
                            if (neighborElement) {
                                neighborElement.classList.remove('col-md-6');
                                neighborElement.classList.add('col-md-7');
                            } else {
                                console.warn("Could not find adjacent target element.");
                            }
                        }
                    }

                    // 如果collection元素已存在，重新應用設置
                    const collectionElement = document.getElementById('collection');
                    if (collectionElement) {
                        const identityType = window.sessionIdentityType ||
                            (window.location.pathname.includes('/deck/build/') ? 'runner' : 'corp');
                        modifycollection(identityType);
                    }
                });
            }
        }
    });
}
// content.js
// 執行
// 初始化
initExtension();


window.addEventListener("message", function listener(event) {

    // 檢查是否是來自 inject.js 的準備訊號
    if (event.source === window && event.data.type === "INJECT_READY_SIGNAL") {

        console.log("ContentJS: Received InjectJS ready signal, sending data now.");

        // 收到訊號後，安全地發送您的數據 payload
        identityType = event.data.id;
        window.sessionIdentityType = identityType; // 保存session級別的identity類型
        console.log('[Content.js] Successfully received data from inject.js:', identityType);
        chrome.storage.sync.get(['customButtons', 'columnOrder'], function (result) {

            const columnOrder = result.columnOrder || defaultOrder;
            const customButtons = result.customButtons || DEFAULT_BTNS; // 記得在 content.js 頂部定義 DEFAULT_BTNS

            window.postMessage({
                type: "NRDB_CUSTOM_FILTER",
                buttons: customButtons,
                columns: columnOrder
            }, "*");
        });


        // 滿足「一次性」要求，移除這個監聽器
        window.removeEventListener("message", listener, false);
    }
}, false);
