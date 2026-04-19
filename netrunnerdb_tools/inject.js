// nrdb_inject_id_only.js - 純粹基於ID的版本
(function () {
    console.log('[NRDB強化-Inject-ID] 注入腳本開始執行。');

    // 全局變量存儲用戶設置（支持 Runner/Corp 分別設置）
    let columnOrder = {};
    try {
        const urlParams = new URLSearchParams(document.currentScript.src.split('?')[1]);
        columnOrder = JSON.parse(decodeURIComponent(urlParams.get('order')));
    } catch (e) { console.error("Order parse failed", e); }

    // 從 storage 讀取用戶設置


    function waitForNRDB(callback, attempts = 150) {
        if (typeof window.NRDB !== 'undefined' &&
            typeof window.NRDB.data !== 'undefined' &&
            typeof window.NRDB.data.cards !== 'undefined') {

            nrdbDataReady = true;
            console.log('[NRDB強化-Inject-ID] 核心資料 (NRDB.data.cards) 已載入。');
            callback();
        } else if (attempts > 0) {
            setTimeout(() => waitForNRDB(callback, attempts - 1), 100);
        } else {
            console.error('[NRDB強化-Inject-ID] 錯誤：NRDB 核心資料載入超時！');
        }
    }
    function new_update_filtered(forceBuild) {
        if (!forceBuild) forceBuild = false; // default parameter value

        $('#collection-table').empty();
        $('#collection-grid').empty();

        var counter = 0, container = $('#collection-table'), display_columns = NRDB.settings.getItem('display-columns');
        var SmartFilterQuery = NRDB.smart_filter.get_query(FilterQuery);

        var orderBy = {};
        if (Sort == 'cost') {
            orderBy['cost'] = Order;
            orderBy['advancement_cost'] = Order;
        } else {
            orderBy[Sort] = Order;
        }
        if (Sort != 'title') orderBy['title'] = 1;

        var matchingCards = NRDB.data.cards.find(SmartFilterQuery, { '$orderBy': orderBy });
        var sortedCards = select_only_latest_cards(matchingCards);

        sortedCards.forEach(function (card) {
            if (ShowOnlyDeck && !card.indeck)
                return;

            // Hide any cards that aren't legal for the ban list selected.
            // This will prevent things like currents from showing up with a '0'
            // option if Standard Ban List 2020.06 is active.
            if (card.maxqty == 0) {
                return;
            }

            var unusable = !is_card_usable(card);

            if (HideDisabled && unusable)
                return;

            var index = card.code;
            if (!CardDivs[display_columns][index] || forceBuild) {
                CardDivs[display_columns][index] = build_div(card);
            }
            var row = CardDivs[display_columns][index].data("index", card.code);
            row.find('input[name="qty-' + card.code + '"]').each(
                function (i, element) {
                    if ($(element).val() == card.indeck)
                        $(element).prop('checked', true)
                            .closest('label').addClass(
                                'active');
                    else
                        $(element).prop('checked', false)
                            .closest('label').removeClass(
                                'active');
                });

            if (unusable)
                row.find('label').addClass("disabled").find(
                    'input[type=radio]').attr("disabled", true);

            if (display_columns > 1
                && counter % display_columns === 0) {
                container = $('<div class="row"></div>').appendTo(
                    $('#collection-grid'));
            }
            container.append(row);
            counter++;
        });
    }


    function newBuildDiv(record) {

        var influ = "";
        for (var i = 0; i < record.faction_cost; i++) {
            influ += "●";
        }

        var max_qty = record.maxqty;
        if (record.type.code != 'identity') {
            switch (NRDB.settings.getItem("card-limits")) {
                case "ignore":
                    max_qty = Math.max(3, max_qty);
                    break;
                case "max":
                    max_qty = 9;
                    break;
            }
        }

        var radios = '';
        for (var i = 0; i <= max_qty; i++) {
            if (i && !(i % 4)) {
                radios += '<br>';
            }
            radios += '<label class="btn btn-xs btn-default'
                + (i == record.indeck ? ' active' : '')
                + '"><input type="radio" name="qty-' + record.code
                + '" value="' + i + '">' + i + '</label>';
        }

        var div = '';
        switch (Number(NRDB.settings.getItem('display-columns'))) {
            case 1:
                var imgsrc = record.faction_code.substr(0, 7) === "neutral" ? "" : '<svg class="typeIcon" aria-label="' + record.faction_code + '"><use xlink:href="/images/icons.svg#faction-' + record.faction_code + '"></use></svg>';
                var unique = record.uniqueness;
                if (unique == false) {
                    unique = '';
                } else { unique = '♦ ' }

                var sideCode = Identity.side_code;
                const currentOrder = columnOrder[sideCode];
                let tmphtml = `<tr class="card-container" data-index="${record.code}">`;

                currentOrder.forEach(col => {
                    if (!col.visible) return;
                    switch (col.id) {
                        case 'indeck':
                            tmphtml += `<td><div class="btn-group" data-toggle="buttons">${radios}</div></td>`; break;
                        case 'title':
                            tmphtml += `<td><a class="card" href="${Routing.generate('cards_zoom', { card_code: record.code })}">${record.uniqueness ? '♦ ' : ''}${record.title}</a></td>`; break;
                        case 'cost':
                            let costnum = record.type.name === 'Agenda' ? record.advancement_cost : record.cost;
                            tmphtml += `<td class="cost">${costnum ?? 'X'}</td>`; break;
                        case 'memory_cost':
                            tmphtml += `<td class="memory_cost">${record.memory_cost ?? ''}</td>`; break;
                        case 'trash_cost':
                            tmphtml += `<td class="trash_cost">${record.trash_cost ?? ''}</td>`; break;
                        case 'strength':
                            tmphtml += `<td class="strength">${record.strength ?? ''}</td>`; break;
                        case 'faction_cost':
                            tmphtml += `<td class="influence influence-${record.faction_code}">${influ}</td>`; break;
                        case 'type_code':
                            tmphtml += `<td class="type"><svg class="typeIcon"><use xlink:href="/images/icons.svg#type-${record.type.code}"></use></svg></td>`; break;
                        case 'faction_code':
                            let imgsrc = record.faction_code.includes("neutral") ? "" : `<svg class="typeIcon"><use xlink:href="/images/icons.svg#faction-${record.faction_code}"></use></svg>`;
                            tmphtml += `<td class="faction">${imgsrc}</td>`; break;
                    }
                });
                tmphtml += '</tr>';
                div = $(tmphtml);
                break;

            case 2:

                div = $('<div class="col-sm-6 card-container" data-index="'
                    + record.code
                    + '">'
                    + '<div class="media"><div class="media-left">'
                    + '<img class="media-object" src="' + record.imageUrl + '" alt="' + record.title + '">'
                    + '</div><div class="media-body">'
                    + '    <h4 class="media-heading"><a class="card" href="'
                    + Routing.generate('cards_zoom', { card_code: record.code })
                    + '" data-target="#cardModal" data-remote="false" data-toggle="modal">'
                    + record.title + '</a> ' + get_influence_penalty_icons(record) + '</h4>'
                    + '    <div class="btn-group" data-toggle="buttons">' + radios
                    + '</div>' + '    <span class="influence influence-' + record.faction_code + '">'
                    + influ + '</span>' + '</div>' + '</div>' + '</div>');
                break;

            case 3:

                div = $('<div class="col-sm-4 card-container" data-index="'
                    + record.code
                    + '">'
                    + '<div class="media"><div class="media-left">'
                    + '<img class="media-object" src="' + record.imageUrl + '" alt="' + record.title + '">'
                    + '</div><div class="media-body">'
                    + '    <h5 class="media-heading"><a class="card" href="'
                    + Routing.generate('cards_zoom', { card_code: record.code })
                    + '" data-target="#cardModal" data-remote="false" data-toggle="modal">'
                    + record.title + '</a> ' + get_influence_penalty_icons(record) + '</h5>'
                    + '    <div class="btn-group" data-toggle="buttons">' + radios
                    + '</div>' + '    <span class="influence influence-' + record.faction_code + '">'
                    + influ + '</span>' + '</div>' + '</div>' + '</div>');
                break;

        }

        return div;
    }



    function new_update_deck(options) {
        var restrainOneColumn = false;
        if (options) {
            if (options.restrainOneColumn)
                restrainOneColumn = options.restrainOneColumn;
        }

        find_identity();
        if (!Identity)
            return;

        if (Identity.side_code === 'runner')
            $('#table-graph-strengths').hide();
        else
            $('#table-graph-strengths').show();

        var displayDescription = getDisplayDescriptions(DisplaySort);
        if (displayDescription == null)
            return;

        if (DisplaySort === 'faction') {
            for (var i = 0; i < displayDescription[1].length; i++) {
                if (displayDescription[1][i].id === Identity.faction_code) {
                    displayDescription[0] = displayDescription[1].splice(i, 1);
                    break;
                }
            }
        }
        if (DisplaySort === 'number' && displayDescription.length === 0) {
            var rows = [];
            NRDB.data.packs.find().forEach(function (pack) {
                rows.push({ id: makeCycleAndPackPosition(pack), label: pack.name });
            });
            displayDescription.push(rows);
        }
        if (restrainOneColumn && displayDescription.length == 2) {
            displayDescription = [displayDescription[0].concat(displayDescription[1])];
        }

        $('#deck-content').empty();
        var cols_size = 12 / displayDescription.length;
        for (var colnum = 0; colnum < displayDescription.length; colnum++) {
            var rows = displayDescription[colnum];
            // Don't rely on the rows being put into displayDescription in order.
            // Explicitly sort them by their provided ID.
            rows.sort((a, b) => {
                if (a.id < b.id) {
                    return -1;
                }
                if (a.id > b.id) {
                    return 1;
                }
                return 0;
            });

            var div = $('<div>').addClass('col-sm-' + cols_size).appendTo($('#deck-content'));
            for (var rownum = 0; rownum < rows.length; rownum++) {
                var row = rows[rownum];
                var item = $(`<h5>${row.label} (<span></span>)</h5>`).hide();
                if (row.image) {
                    item = $(`<h5><svg class="typeIcon" aria-label="${row.label}"><use xlink:href="${row.image}"></use></svg>${row.label} (<span></span>)</h5>`).hide();
                } else if (DisplaySort == "faction") {
                    $('<span class="icon icon-' + row.id + ' ' + row.id + '"></span>').prependTo(item);
                }
                var content = $('<div class="deck-' + row.id + '"></div>');
                div.append(item).append(content);
            }
        }

        InfluenceLimit = 0;
        var cabinet = {};
        var parts = Identity.title.split(/: /);

        $('#identity').html('<a href="' + Routing.generate('cards_zoom', { card_code: Identity.code }) + '" data-target="#cardModal" data-remote="false" class="card" data-toggle="modal" data-index="' + Identity.code + '">' + parts[0] + ' <small>' + parts[1] + '</small></a>' + get_card_legality_icons(Identity));
        $('#img_identity').prop('src', NRDB.card_image_url + '/medium/' + Identity.code + '.jpg');
        InfluenceLimit = Identity.influence_limit;
        if (InfluenceLimit == null || InfluenceLimit == 0)
            InfluenceLimit = Number.POSITIVE_INFINITY;

        check_decksize();

        var orderBy = {};
        switch (DisplaySort) {
            case 'type':
                orderBy['type_code'] = 1;
                break;
            case 'faction':
                orderBy['faction_code'] = 1;
                break;
            case 'number':
                orderBy['code'] = 1;
                break;
            case 'title':
                orderBy['title'] = 1;
                break;
        }
        switch (DisplaySortSecondary) {
            case 'type':
                orderBy['type_code'] = 1;
                break;
            case 'faction':
                orderBy['faction_code'] = 1;
                break;
            case 'number':
                orderBy['code'] = 1;
                break;
        }
        orderBy['title'] = 1;

        var latestpack = Identity.pack;
        var influenceSpent = {};

        NRDB.data.cards.find({
            indeck: { '$gt': 0 },
            type_code: { '$ne': 'identity' },
        }, { '$orderBy': orderBy }).forEach(function (card) {
            if (latestpack.cycle.position < card.pack.cycle.position
                || (latestpack.cycle.position == card.pack.cycle.position && latestpack.position < card.pack.position)) {
                latestpack = card.pack;
            }

            var influence = '';
            if (card.faction_code != Identity.faction_code) {
                var theorical_influence_spent = card.indeck * card.faction_cost;
                influenceSpent[card.code] = get_influence_cost_of_card_in_deck(card);
                for (var i = 0; i < theorical_influence_spent; i++) {
                    if (i && i % 5 == 0)
                        influence += " ";
                    influence += (i < influenceSpent[card.code] ? "●" : "○");
                }

                influence = ' <span class="influence influence-' + card.faction_code + '">' + influence + '</span>';
            }

            var criteria = null;
            var additional_info = get_influence_penalty_icons(card, card.indeck) + influence;

            if (DisplaySort === 'type') {
                criteria = card.type_code, keywords = card.keywords ? card.keywords.toLowerCase().split(" - ") : [];
                if (criteria == "ice") {
                    var ice_type = [];
                    if (keywords.indexOf("barrier") >= 0)
                        ice_type.push("barrier");
                    if (keywords.indexOf("code gate") >= 0)
                        ice_type.push("code-gate");
                    if (keywords.indexOf("sentry") >= 0)
                        ice_type.push("sentry");
                    switch (ice_type.length) {
                        case 0:
                            criteria = "none";
                            break;
                        case 1:
                            criteria = ice_type.pop();
                            break;
                        default:
                            criteria = "multi";
                            break;
                    }
                }
                if (criteria == "program") {
                    if (keywords.indexOf("icebreaker") >= 0)
                        criteria = "icebreaker";
                }
            } else if (DisplaySort === 'faction') {
                criteria = card.faction_code;
            } else if (DisplaySort === 'number') {
                criteria = makeCycleAndPackPosition(card.pack);
            } else if (DisplaySort === 'title') {
                criteria = 'cards';
            }

            if (DisplaySort === 'number' || DisplaySortSecondary === 'number') {
                var number_of_sets = Math.ceil(card.indeck / card.quantity);
                var alert_number_of_sets = number_of_sets > 1 ? '<small class="text-warning">' + number_of_sets + ' sets needed</small> ' : '';
                additional_info = '(<span class="small icon icon-' + card.pack.cycle.code + '"></span> ' + card.position + ') ' + alert_number_of_sets + influence;
            }

            var item = $('<div>' + card.indeck + 'x <a href="' + Routing.generate('cards_zoom', { card_code: card.code }) + '" class="card" data-toggle="modal" data-remote="false" data-target="#cardModal" data-index="' + card.code + '">' + card.title + '</a>' + additional_info + get_card_legality_icons(card) + '</div>');
            item.appendTo($('#deck-content .deck-' + criteria));

            cabinet[criteria] |= 0;
            cabinet[criteria] = cabinet[criteria] + card.indeck;
            $('#deck-content .deck-' + criteria).prev().show().find('span:last').html(cabinet[criteria]);

        });
        $('#latestpack').html('Cards up to <i>' + latestpack.name + '</i>');
        if (NRDB.settings && NRDB.settings.getItem('show-onesies')) {
            show_onesies();
        } else {
            $('#onesies').hide();
        }
        if (NRDB.settings && NRDB.settings.getItem('show-cacherefresh')) {
            show_cacherefresh();
        } else {
            $('#cacherefresh').hide();
        }
        check_influence(influenceSpent);
        check_restricted();
        check_startup_constraints();
        check_deck_limit();
        check_agenda_factions();
        check_ampere_agenda_limits();
        if (NRDB.settings && NRDB.settings.getItem('check-rotation')) {
            check_rotation();
        } else {
            $('#rotated').hide();
        }
        if ($('#costChart .highcharts-container').length)
            setTimeout(make_cost_graph, 100);
        if ($('#strengthChart .highcharts-container').length)
            setTimeout(make_strength_graph, 100);
    }

    function add_integer_sf(key, operator, values) {
        var tmp_array = [];
        var op = "$or";
        for (var j = 0; j < values.length; j++) {
            value = parseInt(values[j], 10);
            switch (operator) {
                case ":":
                    tmp_array.push({
                        [key]: { '$eq': value }
                    });
                    break;
                case "<":
                    tmp_array.push({
                        [key]: { '$lt': value }
                    });
                    break;
                case ">":
                    tmp_array.push({
                        [key]: { '$gt': value }
                    });
                    break;
                case "!":
                    tmp_array.push({
                        [key]: { '$ne': value }
                    });
                    op = "$and";
                    break;
            }
        }
        if (values.length > 1) {
            // Create a wrapping OR around the conditions
            return { [op]: tmp_array };
        }
        else {
            return { [key]: tmp_array[0][key] };
        }
    }
    function add_string_sf(key, operator, values) {
        for (var j = 0; j < values.length; j++) {
            // Do exact matches for packs
            values[j] = key == 'pack_code' ? new RegExp('^(' + values[j] + ')$', 'i') : new RegExp(values[j], 'i');
        }
        switch (operator) {
            case ":":
                return {
                    [key]: {
                        '$in': values
                    }
                };
            case "!":
                return {
                    [key]: {
                        '$nee': null,
                        '$nin': values
                    }
                };
        }
    }
    function add_boolean_sf(key, operator, values) {
        var condition = {}, value = parseInt(values.shift());
        switch (operator) {
            case ":":
                return { [key]: !!value };
            case "!":
                return {
                    [key]: {
                        '$ne': !!value
                    }
                };
        }
    }
    function filterSyntax(query) {
        /* Returns a list of conditions (array)
           Each condition is an array with n>1 elements
           The first is the condition type (0 or 1 character)
           The following are the arguments, in OR */

        query = query.replace(/^\s*(.*?)\s*$/, "$1").replace('/\s+/', ' ');

        var list = [];
        var cond = null;
        /* The automaton has three states:
           1: type search
           2: main argument search
           3: additional argument search
           4: parsing error, we search for the next condition
           If it encounters an argument while searching for a type, then the
           type is empty */
        var etat = 1;
        while (query != "") {
            if (etat == 1) {
                if (cond !== null && etat !== 4 && cond.length > 2) {
                    list.push(cond);
                }
                // we start by looking for a type of condition
                if (query.match(/^(\w)([:<>!])(.*)/)) { // token "condition:"
                    cond = [RegExp.$1.toLowerCase(), RegExp.$2];
                    query = RegExp.$3;
                } else {
                    cond = ["", ":"];
                }
                etat = 2;
            } else {
                if (query.match(/^"([^"]*)"(.*)/) // token "text with quotes"
                    || query.match(/^([^\s|]+)(.*)/) // token text-without-quotes
                ) {
                    if ((etat === 2 && cond.length === 2) || etat === 3) {
                        cond.push(RegExp.$1);
                        query = RegExp.$2;
                        etat = 2;
                    } else {
                        // erreur
                        query = RegExp.$2;
                        etat = 4;
                    }
                } else if (query.match(/^\|(.*)/)) { // token "|"
                    if ((cond[1] === ':' || cond[1] === '!')
                        && ((etat === 2 && cond.length > 2) || etat === 3)) {
                        query = RegExp.$1;
                        etat = 3;
                    } else {
                        // erreur
                        query = RegExp.$1;
                        etat = 4;
                    }
                } else if (query.match(/^ (.*)/)) { // token " "
                    query = RegExp.$1;
                    etat = 1;
                } else {
                    // erreur
                    query = query.substr(1);
                    etat = 4;
                }
            }
        }
        if (cond !== null && etat !== 4 && cond.length > 2) {
            list.push(cond);
        }
        return list;
    }



    function new_handle_input_change(event) {
        var div = $(this).closest('.filter');
        if ($(this).parent().hasClass('newfilter')) {
            div = $(this).closest('.newfilter');
        }
        var columnName = div.attr('id');
        if (columnName == 'pack_code') {
            update_collection_packs();
            return;
        }
        if (columnName != 'my_code_and' && columnName != 'my_code_or') {

            var arr = [];
            div.find("input[type=checkbox]").each(function (index, elt) {
                var name = $(elt).attr('name');

                if (name && $(elt).prop('checked')) {
                    arr.push(name);
                }
            });
            Filters[columnName] = arr;
            FilterQuery = get_filter_query(Filters);
        }

        var $andSection = $('#my_code_and');
        var $orSection = $('#my_code_or');
        MyCustomQueryAND = [];
        $andSection.find("input[type=checkbox]").each(function (index, elt) {
            var value = $(elt).attr('name'); console.log("value:", value);

            if (value && $(elt).prop('checked')) {
                var myFilterQueryTMP = [];

                var conditions = filterSyntax(value);
                for (var i = 0; i < conditions.length; i++) {
                    var condition = conditions[i];
                    var type = condition.shift();
                    var operator = condition.shift();
                    var values = condition.map(v => {
                        return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special characters
                    });
                    switch (type) {
                        case "":
                        case "_":
                            myFilterQueryTMP.push(add_string_sf('stripped_title', operator, values));
                            break;
                        case "x":
                            myFilterQueryTMP.push(add_string_sf('text', operator, values));
                            break;
                        case "a":
                            myFilterQueryTMP.push(add_string_sf('flavor', operator, values));
                            break;
                        case "e":
                            myFilterQueryTMP.push(add_string_sf('pack_code', operator, values));
                            break;
                        case "t":
                            myFilterQueryTMP.push(add_string_sf('type_code', operator, values));
                            break;
                        case "s":
                            myFilterQueryTMP.push(add_string_sf('keywords', operator, values));
                            break;
                        case "i":
                            myFilterQueryTMP.push(add_string_sf('illustrator', operator, values));
                            break;
                        case "o":
                            myFilterQueryTMP.push(add_integer_sf('cost', operator, values));
                            break;
                        case "g":
                            myFilterQueryTMP.push(add_integer_sf('advancement_cost', operator, values));
                            break;
                        case "l":
                            myFilterQueryTMP.push(add_integer_sf("base_link", operator, values));
                            break;
                        case "m":
                            myFilterQueryTMP.push(add_integer_sf("memory_cost", operator, values));
                            break;
                        case "n":
                            myFilterQueryTMP.push(add_integer_sf('faction_cost', operator, values));
                            break;
                        case "p":
                            myFilterQueryTMP.push(add_integer_sf('strength', operator, values));
                            break;
                        case "v":
                            myFilterQueryTMP.push(add_integer_sf('agenda_points', operator, values));
                            break;
                        case "h":
                            myFilterQueryTMP.push(add_integer_sf('trash_cost', operator, values));
                            break;
                        case "u":
                            myFilterQueryTMP.push(add_boolean_sf('uniqueness', operator, values));
                            break;
                        case "y":
                            myFilterQueryTMP.push(add_integer_sf('quantity', operator, values));
                            break;
                    }
                }

                MyCustomQueryAND.push(...myFilterQueryTMP);

            }
        });
        MyCustomQueryOR = [];
        $orSection.find("input[type=checkbox]").each(function (index, elt) {
            var value = $(elt).attr('name'); console.log("value:", value);

            if (value && $(elt).prop('checked')) {
                var myFilterQueryTMP = [];

                var conditions = filterSyntax(value);
                for (var i = 0; i < conditions.length; i++) {
                    var condition = conditions[i];
                    var type = condition.shift();
                    var operator = condition.shift();
                    var values = condition.map(v => {
                        return v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special characters
                    });
                    switch (type) {
                        case "":
                        case "_":
                            myFilterQueryTMP.push(add_string_sf('stripped_title', operator, values));
                            break;
                        case "x":
                            myFilterQueryTMP.push(add_string_sf('text', operator, values));
                            break;
                        case "a":
                            myFilterQueryTMP.push(add_string_sf('flavor', operator, values));
                            break;
                        case "e":
                            myFilterQueryTMP.push(add_string_sf('pack_code', operator, values));
                            break;
                        case "t":
                            myFilterQueryTMP.push(add_string_sf('type_code', operator, values));
                            break;
                        case "s":
                            myFilterQueryTMP.push(add_string_sf('keywords', operator, values));
                            break;
                        case "i":
                            myFilterQueryTMP.push(add_string_sf('illustrator', operator, values));
                            break;
                        case "o":
                            myFilterQueryTMP.push(add_integer_sf('cost', operator, values));
                            break;
                        case "g":
                            myFilterQueryTMP.push(add_integer_sf('advancement_cost', operator, values));
                            break;
                        case "l":
                            myFilterQueryTMP.push(add_integer_sf("base_link", operator, values));
                            break;
                        case "m":
                            myFilterQueryTMP.push(add_integer_sf("memory_cost", operator, values));
                            break;
                        case "n":
                            myFilterQueryTMP.push(add_integer_sf('faction_cost', operator, values));
                            break;
                        case "p":
                            myFilterQueryTMP.push(add_integer_sf('strength', operator, values));
                            break;
                        case "v":
                            myFilterQueryTMP.push(add_integer_sf('agenda_points', operator, values));
                            break;
                        case "h":
                            myFilterQueryTMP.push(add_integer_sf('trash_cost', operator, values));
                            break;
                        case "u":
                            myFilterQueryTMP.push(add_boolean_sf('uniqueness', operator, values));
                            break;
                        case "y":
                            myFilterQueryTMP.push(add_integer_sf('quantity', operator, values));
                            break;
                    }
                }

                MyCustomQueryOR.push(...myFilterQueryTMP);
            }
        });



        FilterQuery = get_filter_query(Filters);
        if (MyCustomQueryOR.length > 0) {
            var tmpFilterQuery = get_filter_query(Filters);
            delete tmpFilterQuery['type_code'];
            customCondition = { "$and": [tmpFilterQuery, { "$or": MyCustomQueryOR }] };
            FilterQuery = { "$or": [FilterQuery, customCondition] };
        }
        if (MyCustomQueryAND.length > 0) {
            var query = MyCustomQueryAND.slice();
            query.push(FilterQuery);
            // Wrap the query with an $and operator
            FilterQuery = { "$and": query };

        }


        console.log("Updated FilterQuery:", JSON.stringify(FilterQuery));
        refresh_collection();
    }



    window.addEventListener("message", function (event) {
        if (event.source !== window || event.data.type !== "NRDB_CUSTOM_FILTER") {
            return;
        }



        const btns = event.data.buttons;
        if (!btns) return;
        const sidePrefix = (typeof Identity !== 'undefined' && Identity.side_code === 'runner') ? 'runner' : 'corp';
        const identityCode = Identity.side_code;
        function renderArea(containerId, buttonList) {
            const $container = $(containerId);
            if ($container.length === 0) return;

            $container.empty(); // 清空舊按鈕，避免重複刷新時堆疊

            buttonList.forEach(btn => {
                if (!btn.enabled || !btn.name || !btn.value) return;

                const newButtonHTML = `
                <label class="btn btn-default btn-sm" 
                       data-code="${btn.value}" 
                       title="${btn.value}" 
                     >
                    <input type="checkbox" name="${btn.value}">
                    ${btn.name}
                </label>
            `;

                $container.append(newButtonHTML);
                const $newBtn = $container.find('label:last');

                // 初始化 Bootstrap Tooltip
                if ($.fn.tooltip) {
                    $newBtn.tooltip({ container: 'body' });
                }
            });
        } renderArea('#my_code_and', btns[sidePrefix + 'AND'] || []);
        renderArea('#my_code_or', btns[sidePrefix + 'OR'] || []);

        console.log('[NRDB強化-Inject-ID] 新增OR按鈕。', name);
    }, false);

    waitForNRDB(() => {
        // 加載用戶設置

        window.build_div = newBuildDiv;
        window.update_filtered = new_update_filtered;
        $('#pack_code,.search-buttons').off('change', 'label', window.handle_input_change);
        window.handle_input_change = new_handle_input_change;
        $('#pack_code,.search-buttons').on('change', 'label', window.handle_input_change);

        if (typeof debounce !== 'undefined') {
            refresh_collection = debounce(new_update_filtered, 250);
            console.log("重新設定 refresh_collection，已連結到新的 update_filtered 邏輯。");
        } else {
            console.error("找不到 debounce 函式，無法重新設定 refresh_collection。");
        }
        window.update_deck = new_update_deck;


        console.log('[NRDB強化-Inject-ID] new_function 已載入。');
        window.MyCustomQuery = [];
        const identityCode = Identity.side_code;
        window.postMessage({
            type: "INJECT_READY_SIGNAL" // 新增一個獨特的訊號類型
            , id: identityCode
        }, "*");

    });


})();
