(function( $ ) {

    //Flag to tell element to temporarily suspend formatting.
    var suspendFormatting = false;

    var formatWithMask = function(value, mask, numeric, alpha){
        if(value.length > 0){
            var formatted = "";
            var valueIndex = 0;
            for(var maskIndex = 0; maskIndex < mask.length; maskIndex++){
                var maskValue = mask.substring(maskIndex, maskIndex+1);
                if(maskValue == '_' && valueIndex < value.length){
                    var incomingValue = value.substring(valueIndex, valueIndex+1);
                    while(valueIndex < value.length && !(incomingValue == '_' || (numeric && $.isNumeric(incomingValue)) || (alpha && isAlpha(incomingValue)))){
                        valueIndex += 1;
                        incomingValue = value.substring(valueIndex, valueIndex+1);
                    }
                    if(valueIndex < value.length){
                        formatted += value.substring(valueIndex, valueIndex+1);
                        valueIndex += 1;
                    } else {
                        formatted += maskValue;
                    }
                } else {
                    formatted += maskValue;
                }
            }
        } else {
            formatted = mask;
        }
        return formatted;
    }

    var nonAlphaNumericCharactersToLeftOfPosition = function(value, pos, numeric, alpha){
        if( !value ){
            return 0;
        }
        if(pos >= value.length){
            pos = value.length - 1;
        }
        var strippedValue;
        if(numeric){
            if(alpha){
                strippedValue = value.substring(0, pos).replace(/[^a-zA-Z0-9]/g, '')
            } else {
                strippedValue = value.substring(0, pos).replace(/\D/g, '');
            }
        } else if(alpha){
            strippedValue = value.substring(0, pos).replace(/[^a-zA-Z]/g, '')
        }
        return pos - strippedValue.length;
    }

    var charLeftOfPos = function(value, pos){
        if(value.length >= pos && pos > 0){
            return value.substring(pos-1, pos);
        }
    }

    var isAlpha = function(char){
        return /^[a-zA-Z]+$/.test(char);
    }

    var setCursorPosition = function($el, pos) {
        $el.each(function(index, elem) {
            if (elem.setSelectionRange) {
                elem.setSelectionRange(pos, pos);
            } else if (elem.createTextRange) {
                var range = elem.createTextRange();
                range.collapse(true);
                range.moveEnd('character', pos);
                range.moveStart('character', pos);
                range.select();
            }
        });
        return this;
    };

    var fromKeyCode = function(keycode, shift){
        var char = String.fromCharCode((96 <= keycode && keycode <= 105) ? keycode-48 : keycode)
        if(isAlpha(char) && !shift){
            char = char.toLocaleLowerCase();
        }
        return char;
    }

    var caret = function(elem, begin, end) {
        var range;
        if (0 !== elem.length && !elem.is(":hidden")) return "number" == typeof begin ? (end = "number" == typeof end ? end : begin,
            elem.each(function() {
                elem.setSelectionRange ? elem.setSelectionRange(begin, end) : elem.createTextRange && (range = elem.createTextRange(),
                    range.collapse(!0), range.moveEnd("character", end), range.moveStart("character", begin),
                    range.select());
            })) : (elem[0].setSelectionRange ? (begin = elem[0].selectionStart, end = elem[0].selectionEnd) : document.selection && document.selection.createRange && (range = document.selection.createRange(),
            begin = 0 - range.duplicate().moveStart("character", -1e5), end = begin + range.text.length),
        {
            begin: begin,
            end: end,
            len: end - begin
        });
    }


    var withFormat = function(elem, format, placeholder, numeric, alpha, preventAutofill){
        // Add $ placeholder if one doesn't already exist
        if(!elem.attr('placeholder') && placeholder){
            elem.attr('placeholder', placeholder);
        }
        elem.keydown(function(e){
            // Allow: home, end, left, right
            if(($.inArray(e.keyCode, [35, 36, 37, 39]) !== -1)){
                return;
            }

            // Allow: tab, enter, escape
            if ($.inArray(e.keyCode, [9, 13, 27]) !== -1){
                return;
            }

            // Allow: CTRL/CMD+Alpha (selection, copy, cut, paste, etc.)
            if((e.ctrlKey === true || e.metaKey === true) && (e.keyCode >= 65 && e.keyCode <= 90)){
                if(e.keyCode >= 65 && e.keyCode < 90){
                    return;
                } else if(e.keyCode == 90){
                    //Allow undo, but make sure we format afterwards or else wierd stuff can happen.
                    setTimeout(function(){if(elem.val()){
                        elem.val(formatWithMask(elem.val(), format, numeric, alpha));
                    }
                    }, 5);
                    return;
                }
            }

            //For all other cases, stop the key event and handle input manually or ignore entirely.
            e.preventDefault();

            var curCaret = caret(elem);
            var pos = curCaret.begin;
            var len = curCaret.len;

            var currentValue = elem.val();

            // Handle: up, down
            if($.inArray(e.keyCode, [38, 40]) !== -1){
                if(e.keyCode == 38){
                    setCursorPosition(elem, 0);
                } else {
                    setCursorPosition(elem, currentValue.length);
                }
            }
            // Handle: backspace
            if ($.inArray(e.keyCode, [8]) !== -1){
                if(currentValue.length > 0 && len == 0){
                    if(pos > 0){
                        var charLeftOfCursor = charLeftOfPos(currentValue, pos);
                        while(pos >= 0 && !(charLeftOfCursor == '_' || (numeric && $.isNumeric(charLeftOfCursor)) || (alpha && isAlpha(charLeftOfCursor)))){
                            pos = pos - 1;
                            charLeftOfCursor = charLeftOfPos(currentValue, pos);
                        }
                        if(pos > 0){
                            charLeftOfCursor = charLeftOfPos(currentValue, pos);
                            if(charLeftOfCursor != '_'){
                                var leftOfCursor = currentValue.substring(0, pos - 1);
                                var rightOfCursor = currentValue.substring(pos);
                                elem.val(leftOfCursor+"_"+rightOfCursor);
                            }
                            setCursorPosition(elem, pos-1);
                        }
                    }
                } else {
                    var leftOfCursor = currentValue.substring(0, pos);
                    var rightOfSelection = currentValue.substring(pos+len);
                    var replacement = format.substring(pos, pos+len);
                    elem.val(formatWithMask(leftOfCursor+replacement+rightOfSelection, format, numeric, alpha));
                    setCursorPosition(elem, pos);
                }
            }
            // Handle: delete
            if ($.inArray(e.keyCode, [46]) !== -1){
                if(currentValue.length > 0 && len == 0){
                    elem.val(formatWithMask(currentValue.substring(0, pos)+currentValue.substring(pos+1), format, numeric, alpha));
                    setCursorPosition(elem, pos);
                } else {
                    var leftOfCursor = currentValue.substring(0, pos);
                    var rightOfSelection = currentValue.substring(pos+len);
                    var replacement = format.substring(pos, pos+len);
                    elem.val(formatWithMask(leftOfCursor+replacement+rightOfSelection, format, numeric, alpha));
                    setCursorPosition(elem, pos);
                }
            }
            // Handle 0-9 on regular keyboard IF not holding shift press 0-9 on the number pad
            if ((numeric && ((!e.shiftKey && (e.keyCode >= 48 && e.keyCode <= 57)) ||
                // Allow 0-9 on the numpad.
                (e.keyCode >= 96 && e.keyCode <= 105))) || (alpha && (e.keyCode >= 65 && e.keyCode <= 90))){
                if(len > 0){
                    var leftOfCursor = currentValue.substring(0, pos);
                    var rightOfSelection = currentValue.substring(pos+len);
                    var replacement = format.substring(pos, pos+len);
                    currentValue = formatWithMask(leftOfCursor+replacement+rightOfSelection, format, numeric, alpha);
                }
                var char = fromKeyCode(e.keyCode, e.shiftKey);
                var newValue = currentValue.substring(0, pos)+char+currentValue.substring(pos+1);
                var nonDigitsBefore = nonAlphaNumericCharactersToLeftOfPosition(newValue, pos, numeric, alpha);
                newValue = formatWithMask(newValue, format, numeric, alpha);
                var nonDigitsAfter = nonAlphaNumericCharactersToLeftOfPosition(newValue, pos+1, numeric, alpha);
                elem.val(newValue);
                var newCursorPosition = pos+1+(nonDigitsAfter-nonDigitsBefore);
                if(newCursorPosition > format.length){
                    setCursorPosition(elem, format.length);
                } else {
                    var nextFormatCharToRight = format.substring(newCursorPosition, newCursorPosition+1);
                    while(newCursorPosition < format.length && !(nextFormatCharToRight == '_' || (numeric && $.isNumeric(nextFormatCharToRight)) || (alpha && isAlpha(nextFormatCharToRight)))){
                        newCursorPosition += 1;
                        nextFormatCharToRight = format.substring(newCursorPosition, newCursorPosition+1);
                    }
                    setCursorPosition(elem, newCursorPosition)
                }
            }
        });

        if(preventAutofill){
            //This looks weird, but if you click on an input that already has focus, Chrome lights up their autofill feature.
            //Dropping and reaquiring focus prevents this.
            elem.click(function(e){
                if($(this).is(":focus")){
                    suspendFormatting = true;
                    $(this).blur();
                    $(this).focus();
                    suspendFormatting = false;
                }
            });
        }

        elem.blur(function(){
            if(!suspendFormatting){
                elem.val(formatWithMask(elem.val(), format, numeric, alpha));
                if(elem.val().indexOf("_")>=0){
                    elem.val("");
                }
            }
        });

        elem.focus(function(){
            if(!suspendFormatting){
                if(!elem.val()){
                    elem.val(format);
                    var newCursorPosition = 0;
                    var nextFormatCharToRight = format.substring(newCursorPosition, newCursorPosition+1);
                    while(newCursorPosition < format.length && !((numeric && $.isNumeric(nextFormatCharToRight)) || (alpha && isAlpha(nextFormatCharToRight)) || nextFormatCharToRight == '_')){
                        newCursorPosition += 1;
                        nextFormatCharToRight = format.substring(newCursorPosition, newCursorPosition+1);
                    }
                    setCursorPosition(elem, newCursorPosition);
                    setTimeout(function(){setCursorPosition(elem, newCursorPosition);}, 5);
                }
            }
        });

        if(elem.val()){
            elem.val(formatWithMask(elem.val(), format, numeric, alpha));
        }

        elem.bind("paste", function(){
            setTimeout(function(){if(elem.val()){
                elem.val(formatWithMask(elem.val(), format, numeric, alpha));
            }
            }, 5);
        });

        elem.bind("cut", function(){
            setTimeout(function(){if(elem.val()){
                elem.val(formatWithMask(elem.val(), format, numeric, alpha));
            }
            }, 5);
        });

    }

    $.fn.asDate = function(){
        this.each(function(index, elem) {
            elem = $(elem);
            withFormat(elem, "__/__/____","MM/DD/YYYY", true, false, true);
        });
        return this;
    }

    $.fn.asUSPhoneNumber = function(){
        this.each(function(index, elem) {
            elem = $(elem);
            withFormat(elem, "(___) ___-____", "Phone", true, false, true);
        });
        return this;
    }

    $.fn.asSSN = function(){
        this.each(function(index, elem) {
            elem = $(elem);
            withFormat(elem, "___-__-____", "SSN", true, false, true);
        });
        return this;
    }

    $.fn.asUSZipCode = function(){
        this.each(function(index, elem) {
            elem = $(elem);
            withFormat(elem, "_____", "Postal Code", true, false, true);
        });
        return this;
    }

    $.fn.asUsStateAbbr = function(){
        this.each(function(index, elem) {
            elem = $(elem);
            withFormat(elem, "__", "State", false, true, true);
        });
        return this;
    }

    $.fn.formatNumericWithFilter = function(filter, placeholder){
        this.each(function(index, elem) {
            elem = $(elem);
            withFormat(elem, filter, placeholder, true, false, true);
        });
        return this;
    }

    $.fn.formatAlphaWithFilter = function(filter, placeholder){
        this.each(function(index, elem) {
            elem = $(elem);
            withFormat(elem, filter, placeholder, false, true, true);
        });
        return this;
    }

    $.fn.formatAlphaNumericWithFilter = function(filter, placeholder){
        this.each(function(index, elem) {
            elem = $(elem);
            withFormat(elem, filter, placeholder, true, true, true);
        });
        return this;
    }

}( jQuery ));
