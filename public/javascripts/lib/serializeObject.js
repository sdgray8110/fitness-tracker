jQuery.fn.serializeObject = function(appendCheckboxes) {
    appendCheckboxes = typeof(appendCheckboxes) !== 'undefined' ? appendCheckboxes : false;
    var o = {},
        a = this.serializeArray();

    var addUncheckedboxes = function(array, form) {
        var checkboxes = form.find('input[type=checkbox]');

        checkboxes.each(function(i) {
            var field = jQuery(this),
                name = field.attr('name');

            if (!field.is(':checked')) {
                array.push({
                    name: name,
                    value: ''
                });
            }
        });

        return array;
    };


    if (appendCheckboxes) {
        a = addUncheckedboxes(a, this);
    }

    jQuery.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};