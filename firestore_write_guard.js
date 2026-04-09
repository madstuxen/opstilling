/**
 * Når FIRESTORE_WRITES_ENABLED er false: alle Firestore-skrivninger bliver no-op.
 * Læsning (.get(), queries) påvirkes ikke.
 */
(function () {
    function applyGuard() {
        if (window.FIRESTORE_WRITES_ENABLED === true) return;
        if (typeof firebase === 'undefined' || !firebase.firestore) return;
        if (firebase.firestore.__writeGuardApplied) return;
        firebase.firestore.__writeGuardApplied = true;

        function log(op, path) {
            console.warn('[Firestore] Skrivning blokeret (' + op + '):', path);
        }

        var DR = firebase.firestore.DocumentReference.prototype;
        DR.set = function () {
            log('set', this.path);
            return Promise.resolve();
        };
        DR.update = function () {
            log('update', this.path);
            return Promise.resolve();
        };
        DR.delete = function () {
            log('delete', this.path);
            return Promise.resolve();
        };

        var CR = firebase.firestore.CollectionReference.prototype;
        CR.add = function () {
            log('add', this.path);
            return Promise.resolve({ id: 'noop-blocked' });
        };

        var WBProto = firebase.firestore.WriteBatch && firebase.firestore.WriteBatch.prototype;
        if (WBProto) {
            WBProto.set = function (docRef) {
                log('batch.set', docRef && docRef.path);
                return this;
            };
            WBProto.update = function (docRef) {
                log('batch.update', docRef && docRef.path);
                return this;
            };
            WBProto.delete = function (docRef) {
                log('batch.delete', docRef && docRef.path);
                return this;
            };
        }
    }

    applyGuard();
    setTimeout(applyGuard, 0);
})();
