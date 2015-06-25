/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


function getDollarString(num) {
    var ds = '$$$$$';
    return '<span class="green">' + ds.substr(0,num) + '</span>' + '<span class="grey">' + ds.substr(0, (5 - num)) + '</span>';
}

function getDollarSign(cost, high, low) {
    var result = 1;

    if(cost < low) {
        return 1;
    } else if(cost > high) {
        return 5;
    } else {
        var newValue = changeRange(cost, high, low, 5, 1);
        return Math.round(newValue);
    }
}

function changeRange(oldValue, oldMax, oldMin, newMax, newMin) {
    var oldRange = (oldMax - oldMin);
    var newRange = (newMax - newMin);
    return (((parseFloat(oldValue) - oldMin) * newRange) / oldRange) + newMin;
}