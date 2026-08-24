// Progressive-enhancement only. The app works without JS; this just adds
// confirm dialogs and the exact-split toggle. Kept in a file (not inline) so
// the Content-Security-Policy can stay strict (script-src 'self').
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        // Confirm-before-submit for any form marked with data-confirm.
        document.querySelectorAll('form[data-confirm]').forEach(function (form) {
            form.addEventListener('submit', function (e) {
                if (!window.confirm(form.getAttribute('data-confirm'))) {
                    e.preventDefault();
                }
            });
        });

        // Expense form: show exact-amount inputs only when "Özel" split is chosen
        // and the participant is selected.
        var splitSelect = document.getElementById('splitType');
        if (!splitSelect) {
            return;
        }

        function refresh() {
            var exact = splitSelect.value === '1';
            document.querySelectorAll('[data-exact-cell]').forEach(function (cell) {
                cell.style.display = exact ? '' : 'none';
            });
            document.querySelectorAll('.participant-row').forEach(function (row) {
                var cb = row.querySelector('input[type="checkbox"]');
                var amt = row.querySelector('input.exact-input');
                if (amt) {
                    amt.disabled = !exact || !cb.checked;
                }
            });
        }

        splitSelect.addEventListener('change', refresh);
        document.querySelectorAll('.participant-row input[type="checkbox"]').forEach(function (cb) {
            cb.addEventListener('change', refresh);
        });
        refresh();
    });
})();
