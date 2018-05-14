$(document).ready(function () {
    MVCControlManager.SiteMaster.setDefaults();
});

var MVCControlManager = {
    Home: {
        MVCControlManager: {}
    },
    SiteMaster: {
        setDefaults: function () {
            $.jgrid.defaults = $.extend($.jgrid.defaults, {
                datatype: 'json',
                height: 'auto',
                imgpath: '/Content/GridCss/images',
                jsonReader: {
                    root: "Rows",
                    page: "Page",
                    total: "Total",
                    records: "Records",
                    repeatitems: false,
                    userdata: "UserData",
                    id: "Id"
                },
                loadui: "block",
                mtype: 'GET',
                multiboxonly: true,
                rowNum: 10,
                rowList: [10, 20, 50],
                viewrecords: true
            });
        }
    }
};

 // Used for the validation in the built in editor
function handleMvcResponse(response, postdata) {
    return eval('(' + response.responseText + ')');
}

 function rowIsBeingEdited(grid, row) {
    var edited = "0";
    var ind = grid.getInd(row, true);

    if (ind != false) {
        edited = $(ind).attr("editable");
    }

    if (edited === "1") {
        // row is being edited        
        return true;
    } else {
        // row is not being edited
        return false;
    }
}

function getAllEditedRows(grid) {
    return grid.find("tr[editable='1']");
}

function anyRowBeingEdited(grid) {
    return getAllEditedRows(grid).length > 0;
}

function saveAllChangedRows(grid) {
    var changedRows = getAllEditedRows(grid);
    jQuery.each(changedRows, function () { grid.jqGrid('saveRow', this.id); });
    updateButtonState(grid);
}

function cancelAllChangedRows(grid) {
    var changedRows = getAllEditedRows(grid);
    jQuery.each(changedRows, function () { grid.jqGrid('restoreRow', this.id); });
    updateButtonState(grid);
}

function updateButtonState(mygrid) {
    selrow = mygrid.jqGrid('getGridParam', 'selrow');
    var gridName = mygrid[0].id;

    var updateButtons = $('input[gridMethod="update_' + gridName + '"]');
    var saveButtons = $('input[gridMethod="save_' + gridName + '"]');
    var cancelButtons = $('input[gridMethod="cancel_' + gridName + '"]');
    var deleteButtons = $('input[gridMethod="delete_' + gridName + '"]');

    if (updateButtons.length == 0 && saveButtons.length == 0 && cancelButtons.length == 0 && deleteButtons.length == 0) {
        return;
    }

    var rowIsSelected = selrow != undefined;
    updateButtons.attr('disabled', !rowIsSelected);
    deleteButtons.attr('disabled', !rowIsSelected);

    // Per row methods
    var rowBeingEdited = rowIsBeingEdited(mygrid, selrow);
    if (rowBeingEdited) {
        updateButtons.attr('disabled', true);
    }
    saveButtons.filter('[allRows="False"]').attr('disabled', !rowBeingEdited);
    cancelButtons.filter('[allRows="False"]').attr('disabled', !rowBeingEdited);

    var beingEdited = anyRowBeingEdited(mygrid);
    saveButtons.filter('[allRows="True"]').attr('disabled', !beingEdited);
    cancelButtons.filter('[allRows="True"]').attr('disabled', !beingEdited);
}

/* MVCControls jqGrid Custom Pager Implementation */
function grid_ChangePage(gridId, pageNumber) {

    var newPageNumber;
    var currentPageNumber = $("#" + gridId)[0].p.page;

    switch (pageNumber) {
        case -2:
            newPageNumber = currentPageNumber - 1;
            break;
        case -1:
            newPageNumber = currentPageNumber + 1;
            break;
        default:
            newPageNumber = pageNumber;
    }

    if ($("#" + gridId + "Page" + newPageNumber.toString()).length == 0) return;

    $("#" + gridId + "Page" + currentPageNumber.toString())[0].className = "gridPagerNormalButton";
    $("#" + gridId + "Page" + newPageNumber.toString())[0].className = "gridPagerSelectedButton";

    $("#" + gridId)[0].p.page = newPageNumber;
    $("#" + gridId).trigger("reloadGrid");
}

/* Initializes the custom MVCControls grid pager */
function grid_initPager(gridId) {

    var pageCount = $("#" + gridId)[0].p.lastpage;
    var currGrid = $("#" + gridId);
    var currButton = $("#" + gridId + "Page1");

    if (currGrid.attr("isLoaded") == "true") return;

    var currentRow;
    var i = 0;

    for (i = 2; i <= pageCount; i++) {
        currentRow = $("<td width=\"18\" id=\"" + gridId + "Page" + i.toString() + "\" onclick=\"grid_ChangePage('" + gridId + "'," + i.toString() + ");\" align=\"center\" class=\"gridPagerNormalButton\">" + i.toString() + "</td>");
        currentRow.insertAfter(currButton);
        currButton = currentRow;
    }

    currGrid.attr("isLoaded", "true");
}

/* Store dirty grid rows */
var _gridNewRows = new Array();
var _currentInsertState = null;

/* Add a new grid row 
Parameters: gridName      - The name of the grid
defaultObject - The default object to display (optional)
*/
function gridAddRow(gridName, defaultObject) {
    if (defaultObject == null || defaultObject == undefined) defaultObject = new Object();
    var grid = $("#" + gridName);
    var total = grid.getGridParam("records");
    grid.addRowData(total + 1, defaultObject);
    grid.editRow(total + 1);
}

/* MVCControls jqGrid bulk save support */
function gridSaveRows(gridName, saveUrl, parameterName, callback) {
    var currGrid = $("#" + gridName);
    var gridRows = getAllEditedRows(currGrid);
    var rowsData = new Array();
    var i;

    if (gridRows == undefined) return;
    var _rowIds = new Array();
    for (i = 0; i < gridRows.length; i++) {
        var id = parseInt(gridRows[i].id);
        jQuery("#" + gridName).jqGrid('saveRow', id, null, "clientArray");
        rowsData.push(currGrid.getRowData(id));
        _rowIds.push(id);
    }

    // Used when the bulk update is cancelled
    _gridNewRows[gridName] = _rowIds;

    var args = $.toJSON(rowsData, null, parameterName);

    _currentInsertState = new Object();
    _currentInsertState.callback = callback;
    _currentInsertState.gridName = gridName;
    _currentInsertState.saveUrl = saveUrl;
    _currentInsertState.parameterName = parameterName;

    $.post(saveUrl, args, _onAfterGridSave, "json");
}

/* Internal wrapper for the post callback */
function _onAfterGridSave(data) {
    var clientState = _currentInsertState;
    _currentInsertState = null;

    /* If client has specified a callback method, run it and check for cancellation */
    if (clientState.callback != null && clientState.callback != undefined) {
        if (!clientState.callback(data)) {
            /* User has cancelled the operation - make rows editable */
            var currGridRows = _gridNewRows[clientState.gridName];
            var currGrid = $("#" + clientState.gridName);

            var i = 0;
            for (i = 0; i < currGridRows.length; i++)
                currGrid.editRow(currGridRows[i]);

            return;
        }
        else {
            /* User accepted the changes */
            /* Clear dirty rows */
            _gridNewRows[clientState.gridName] = new Array();
        }
    }
}


/* jQuery toJSON plugin - patched to support MVC post-like paramters */
(function ($) {
    m = {
        '\b': '\\b',
        '\t': '\\t',
        '\n': '\\n',
        '\f': '\\f',
        '\r': '\\r',
        '"': '\\"',
        '\\': '\\\\'
    },
$.toJSON = function (value, whitelist, prefix) {
    var a,          // The array holding the partial texts.
		i,          // The loop counter.
		k,          // The member key.
		l,          // Length.
		r = /["\\\x00-\x1f\x7f-\x9f]/g,
		v;          // The member value.

    switch (typeof value) {
        case 'string':
            return value;
            //            return r.test(value) ?
            //			'"' + value.replace(r, function(a) {
            //			    var c = m[a];
            //			    if (c) {
            //			        return c;
            //			    }
            //			    c = a.charCodeAt();
            //			    return '\\u00' + Math.floor(c / 16).toString(16) + (c % 16).toString(16);
            //			}) + '"' :
            //			'"' + value + '"';

        case 'number':
            return isFinite(value) ? String(value) : 'null';

        case 'boolean':
        case 'null':
            return String(value);

        case 'object':
            if (!value) {
                return 'null';
            }
            if (typeof value.toJSON === 'function') {
                return $.toJSON(value.toJSON());
            }
            a = [];
            if (typeof value.length === 'number' &&
				!(value.propertyIsEnumerable('length'))) {
                l = value.length;
                for (i = 0; i < l; i += 1) {
                    a.push($.toJSON(value[i], whitelist, prefix + "[" + i + "]") || 'null');
                }
                return a.join("&");
                //return '[' + a.join(',') + ']';
            }
            if (whitelist) {
                l = whitelist.length;
                for (i = 0; i < l; i += 1) {
                    k = whitelist[i];
                    if (typeof k === 'string') {
                        v = $.toJSON(value[k], whitelist);
                        if (v) {
                            //a.push($.toJSON(k) + ':' + v);
                            a.push(prefix + "." + k + "=" + v);
                        }
                    }
                }
            } else {
                for (k in value) {
                    if (typeof k === 'string') {
                        v = $.toJSON(value[k], whitelist);
                        if (v) {
                            //a.push($.toJSON(k) + ':' + v);
                            a.push(prefix + "." + k + "=" + v);
                        }
                    }
                }
            }
            //            return '{' + a.join(',') + '}';
            return a.join("&");
    }
};

})(jQuery);


/* Used by the select formatter of the grid */
function gridFillList(source) {
    if (source.indexOf("(") > -1)
        return eval(source);
    else {        
        return eval($.ajax({ url: source, async: false }).responseText);
    }
}


function _autoCompleteBinder(ctrlName, hiddenElem, onSelectCallback, url, delay, resultCount, minLen) {
    $(ctrlName).autocomplete({ delay: delay, minLength: minLen,
        source: function (request, response) {

            data = new Object();
            data.userInput = request.term;
            data.resultCount = resultCount;

            if (onSelectCallback != null) {
                var res = onSelectCallback($(ctrlName), data);
                if (res == false) { response(new Array()); return false; }
            }

            $.ajax({ url: url, type: "POST", dataType: "json", data: data, success: function (d) { response(d); } });
        }
    });

    $(ctrlName).bind("autocompleteselect", function (e, res) { $(hiddenElem).val(res.item.id).trigger('change'); $(ctrlName).trigger('change'); });
    $(ctrlName).keyup(function (e) { if (e.keyCode != '13') $(hiddenElem).val(null).trigger('change'); });
}


var _accordion_loadingText = "Loading...";

function _accordion_changeItem(event, ui) {

    if (ui.newContent.length != 0) {
        var isCache = $(event.target).attr("mvc_cacheItems");
        if ((ui.newContent[0].innerHTML == _accordion_loadingText) || (isCache == "false")) {
            jQuery(ui.newContent[0]).load(ui.newHeader.attr("mvc-action"));
        }
    }
    else {
        if (ui.oldContent[0].innerHTML == _accordion_loadingText) {
            jQuery(ui.oldContent[0]).load(ui.oldHeader.attr("mvc-action"));
        }
    }
}