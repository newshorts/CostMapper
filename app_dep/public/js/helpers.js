/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


// removes code and some unwanted strings
function formatDef(def) {
    return def.substr(def.search(/[a-zA-Z ]+/)).replace('- ', '');
}

function formatMoney(num) {
    return '$'+parseFloat(num).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}