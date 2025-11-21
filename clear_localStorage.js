// Kode til at slette alt i localStorage
// Kopier dette og indsæt det i browser console (F12 -> Console), eller kør det direkte i console

// Slet alt i localStorage
localStorage.clear();

// Bekræft at det er slettet
console.log('localStorage er nu tom:', localStorage.length === 0);

// Hvis du vil slette specifikke keys i stedet for alt:
// localStorage.removeItem('keyName');

// Eksempel på at slette specifikke keys:
// localStorage.removeItem('logbogData');
// localStorage.removeItem('bodymapData');
// localStorage.removeItem('dialogData');
// localStorage.removeItem('opstillingData');
// localStorage.removeItem('compareData');
// localStorage.removeItem('forside_checkin_data');
// localStorage.removeItem('global_useFirestore');
