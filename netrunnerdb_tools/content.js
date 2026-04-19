// NetrunnerDB 簡化收藏擴展 - Content Script
console.log('[NetrunnerDB Extension] 加载中...');

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
    runner: ['indeck', 'title', 'cost', 'memory_cost', 'strength', 'faction_cost', 'type_code', 'faction_code'],
    corp: ['indeck', 'title', 'cost', 'trash_cost', 'faction_cost', 'type_code', 'faction_code']
};


// 修正後的 modifycollection 函式，會等待元素出現
function insertEmptyFilterRow() {

    // --- 1. 定義 HTML 結構 ---
    // 這裡使用模板字串來定義新的 HTML 結構
    const newSearchButtonsHTML = `
       <div class="row search-buttons">
    <div class="col-sm-6" style="margin-bottom:10px">
        <div id="faction_code" class="filter btn-group btn-group-justified" data-toggle="buttons"></div>
    </div>
    <div class="col-sm-6" style="margin-bottom:10px">
        <div id="type_code" class="filter btn-group btn-group-justified" data-toggle="buttons"></div>
    </div>

    <div class="col-sm-12" style="margin-bottom:10px; display: flex; align-items: center;">
        <div style="width: 80px; flex-shrink: 0; font-weight: bold; color: #666; font-size: 12px;">
            自訂 (OR)
        </div>
        <div id="my_code_or" class="newfilter btn-group btn-group-justified" data-toggle="buttons" style="flex-grow: 1;"></div>
    </div>

    <div class="col-sm-12" style="margin-bottom:10px; display: flex; align-items: center;">
        <div style="width: 80px; flex-shrink: 0; font-weight: bold; color: #666; font-size: 12px;">
            自訂 (AND)
        </div>
        <div id="my_code_and" class="newfilter btn-group btn-group-justified" data-toggle="buttons" style="flex-grow: 1;"></div>
    </div>
</div>
    `;
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = newSearchButtonsHTML;
    const newRowElement = tempContainer.firstElementChild;
    // --- 2. 查找目標元素 (取代 $('.row.search-buttons')) ---
    const existingSearchButtonsRow = document.querySelector('.row.search-buttons');

    // --- 3. 檢查元素並插入新的結構 ---
    if (existingSearchButtonsRow) {
        existingSearchButtonsRow.replaceWith(newRowElement);
        console.log('✅ 新的篩選器結構已使用原生 JS 成功插入。');
    } else {
        console.error("無法從臨時容器中提取有效的 Element。請檢查 HTML 結構。");
    }

}


const LABEL_MAP = {
    indeck: 'Quantity', title: 'Name', cost: 'Cost',
    memory_cost: 'Mem.', trash_cost: 'Trash',
    strength: 'Str.', faction_cost: 'I.',
    type_code: 'T.', faction_code: 'F.'
};

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
        console.log(`[Content.js] ${order} 表頭排序渲染完成`);

        console.log(`[Content.js] ${identityType} 表頭排序渲染完成`);
    }

}


// 注入脚本到页面上下文
function injectScript(columnOrder) {
    const script = document.createElement('script');
    const settingsStr = encodeURIComponent(JSON.stringify(columnOrder));
    script.src = chrome.runtime.getURL('inject.js') + '?order=' + settingsStr;

    (document.head || document.documentElement).appendChild(script);

    script.onload = function () {
        console.log('[NetrunnerDB Extension] inject.js 注入成功');
        script.remove();
    };

    script.onerror = function () {
        console.error('[NetrunnerDB Extension] inject.js 注入失败');
    };
    window.customColumnOrder = columnOrder;
}

// 等待页面加载完成后初始化
function initExtension() {
    console.log('[NetrunnerDB Extension] 初始化中...');

    // 首先加載用戶設置


    const currentPath = window.location.pathname;
    console.log('[NetrunnerDB Extension] 当前路径:', currentPath);

    if (currentPath.includes('/deck/edit/') || currentPath.includes('/deck/build/')) {
        console.log('[NetrunnerDB Extension] 检测到牌库编辑页面');

        insertEmptyFilterRow();


        // 無論頁面狀態如何，都先確保 DOM 載入後再注入和嘗試修改
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.sync.get(['columnOrder'], function (result) {
                // 更新所有設置，使用默認值
                const columnOrder = result.columnOrder || defaultOrder;
                console.log('[NetrunnerDB Extension] 欄位設置已載入:', columnOrder);

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
                            console.warn("找不到相鄰的目標元素。");
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
}
// content.js
// 執行
// 初始化
initExtension();


window.addEventListener("message", function listener(event) {

    // 檢查是否是來自 inject.js 的準備訊號
    if (event.source === window && event.data.type === "INJECT_READY_SIGNAL") {

        console.log("ContentJS: 收到 InjectJS 準備好的訊號，現在發送數據。");

        // 收到訊號後，安全地發送您的數據 payload
        identityType = event.data.id;
        window.sessionIdentityType = identityType; // 保存session級別的identity類型
        console.log('[Content.js] 成功從 inject.js 接收到數據:', identityType);

        if (identityType === 'runner') {
            window.postMessage({
                type: "NRDB_CUSTOM_FILTER_READY",
                name: "Decoder",
                value: "s:Decoder",
                value2: 'and'

            }, "*");

            window.postMessage({
                type: "NRDB_CUSTOM_FILTER_READY",
                name: "Killer",
                value: "s:Killer",
                value2: 'and'
            }, "*");

            window.postMessage({
                type: "NRDB_CUSTOM_FILTER_READY",
                name: "Fracter",
                value: "s:Fracter",
                value2: 'or'
            }, "*");

            window.postMessage({
                type: "NRDB_CUSTOM_FILTER_READY",
                name: "AI",
                value: "s:AI",
                value2: 'or'

            }, "*");
        } else {

        }

        // 滿足「一次性」要求，移除這個監聽器
        window.removeEventListener("message", listener, false);
    }
}, false);
