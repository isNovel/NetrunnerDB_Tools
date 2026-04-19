const LABEL_MAP = {
    indeck: '數量 (Qty)', title: '名稱 (Title)', cost: '費用 (Cost)',
    memory_cost: '記憶體 (MU)', trash_cost: '垃圾費 (Trash)',
    strength: '強度 (Str)', faction_cost: '影響力 (Inf)',
    type_code: '類型 (Type)', faction_code: '勢力 (Faction)'
};

const DEFAULT_BTNS = {
    runnerAND: [{ name: "Stealth", value: "x:Stealth", enabled: true }, { name: "Run", value: "s:Run", enabled: true }],
    runnerOR: [{ name: "AI", value: "s:AI", enabled: true }, { name: "Decoder", value: "s:Decoder", enabled: true }, { name: "Killer", value: "s:Killer", enabled: true }, { name: "Fracter", value: "s:Fracter", enabled: true }],
    corpAND: [{ name: "Liability", value: "s:Liability", enabled: true }, { name: "Black Ops", value: "s:Black Ops", enabled: true }, { name: "Gray Ops", value: "s:Gray Ops", enabled: true }],
    corpOR: [{ name: "Barrier", value: "s:Barrier", enabled: true }, { name: "Code Gate", value: "s:Code Gate", enabled: true }, { name: "Sentry", value: "s:Sentry", enabled: true }]
};

const DEFAULT_ORDER = {
    runner: ['indeck', 'title', 'cost', 'memory_cost', 'strength', 'faction_cost', 'type_code', 'faction_code'].map(id => ({ id, visible: true })),
    corp: ['indeck', 'title', 'cost', 'trash_cost', 'faction_cost', 'type_code', 'faction_code'].map(id => ({ id, visible: true }))
};

// --- 自動儲存 ---
let saveTimeout;
function autoSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        // 抓取欄位順序與顯示狀態
        const getColumnData = (id) => {
            const list = document.getElementById(id);
            if (!list) return [];
            return Array.from(list.querySelectorAll('li')).map(li => ({
                id: li.dataset.id,
                visible: li.querySelector('.visibility-toggle').checked
            }));
        };

        // 抓取自定義按鈕數據
        const getBtnData = (id) => {
            const container = document.getElementById(id);
            if (!container) return [];
            return Array.from(container.querySelectorAll('.btn-row')).map(row => ({
                enabled: row.querySelector('.btn-enabled').checked,
                name: row.querySelector('.btn-name').value,
                value: row.querySelector('.btn-value').value
            }));
        };

        const data = {
            columnOrder: {
                runner: getColumnData('runner-list'),
                corp: getColumnData('corp-list')
            },
            customButtons: {
                runnerAND: getBtnData('runner-and-btns'),
                runnerOR: getBtnData('runner-or-btns'),
                corpAND: getBtnData('corp-and-btns'),
                corpOR: getBtnData('corp-or-btns')
            }
        };

        chrome.storage.sync.set(data, () => {
            console.log('Autosaved Data:', data);
        });
    }, 250);
}

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    // 處理選單收合邏輯
    document.querySelectorAll('.menu-title, .submenu-title').forEach(title => {
        title.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = title.parentElement; // menu-item 或 submenu
            parent.classList.toggle('open');
        });
    });

    // 從 Storage 載入設定
    chrome.storage.sync.get(['columnOrder', 'customButtons'], (res) => {
        const order = res.columnOrder || DEFAULT_ORDER;
        renderColumnList('runner-list', order.runner);
        renderColumnList('corp-list', order.corp);

        const btns = res.customButtons || DEFAULT_BTNS;

        if (!res.columnOrder || !res.customButtons) {
            chrome.storage.sync.set({ columnOrder: order, customButtons: btns }, () => {
                console.log('首次安裝，已寫入預設值');
            });
        }
        renderButtonEditor('runner-and-btns', btns.runnerAND);
        renderButtonEditor('runner-or-btns', btns.runnerOR);
        renderButtonEditor('corp-and-btns', btns.corpAND);
        renderButtonEditor('corp-or-btns', btns.corpOR);

    });

    // 新增按鈕
    document.querySelectorAll('.add-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const type = btn.dataset.type;
            const containerId = {
                'runnerAND': 'runner-and-btns',
                'runnerOR': 'runner-or-btns',
                'corpAND': 'corp-and-btns',
                'corpOR': 'corp-or-btns'
            }[type];

            const container = document.getElementById(containerId);
            if (container) {
                container.appendChild(createBtnRow());
                autoSave();
            }
        });
    });

    // 刷新頁面按鈕
    document.getElementById('save-btn').addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) chrome.tabs.reload(tabs[0].id);
            window.close();
        });
    });
});

// --- 工具函式 ---

function renderColumnList(listId, items) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = ''; // 清空預覽
    items.forEach(item => {
        const li = document.createElement('li');
        li.dataset.id = item.id;
        li.draggable = true;
        if (!item.visible) li.classList.add('hidden-item');
        li.innerHTML = `
            <span class="handle">☰</span>
            <input type="checkbox" class="visibility-toggle" ${item.visible ? 'checked' : ''}>
            <span>${LABEL_MAP[item.id] || item.id}</span>
        `;

        li.querySelector('.visibility-toggle').addEventListener('change', (e) => {
            li.classList.toggle('hidden-item', !e.target.checked);
            autoSave();
        });

        li.addEventListener('dragstart', () => li.classList.add('dragging'));
        li.addEventListener('dragend', () => {
            li.classList.remove('dragging');
            autoSave();
        });

        list.appendChild(li);
    });

    // 拖拽排序監聽 (放在 list 上只需綁定一次)
    list.addEventListener('dragover', (e) => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        if (!draggingItem || draggingItem.parentElement !== list) return;

        const siblings = [...list.querySelectorAll('li:not(.dragging)')];
        let next = siblings.find(sib => {
            return e.clientY <= sib.offsetTop + sib.offsetHeight / 2;
        });
        list.insertBefore(draggingItem, next);
    });
}

function createBtnRow(name = '', value = '', enabled = true) {
    const div = document.createElement('div');
    div.className = 'btn-row';
    div.innerHTML = `
        <input type="checkbox" class="btn-enabled" ${enabled ? 'checked' : ''}>
        <input type="text" class="btn-name" placeholder="標籤" value="${name}">
        <input type="text" class="btn-value" placeholder="語法" value="${value}">
        <button class="del-btn">×</button>
    `;

    // 綁定輸入即時存檔
    div.querySelectorAll('input').forEach(i => {
        i.addEventListener('input', autoSave);
        i.addEventListener('change', autoSave);
    });

    div.querySelector('.del-btn').addEventListener('click', () => {
        div.remove();
        autoSave();
    });
    return div;
}

function renderButtonEditor(id, list) {
    const con = document.getElementById(id);
    if (!con) return;
    con.innerHTML = '';
    list.forEach(item => con.appendChild(createBtnRow(item.name, item.value, item.enabled)));
}