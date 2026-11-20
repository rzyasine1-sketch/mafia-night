(() => {
  const definitions = [
 {id:'killer',name:'الإمبوستر القاتل',team:'mafia',desc:'تختار لاعبًا لقتله أثناء الليل.',short:'فريق الإمبوستر',symbol:'قتل',night:true},
 {id:'mute',name:'الإمبوستر الصامت',team:'mafia',desc:'تختار لاعبًا يُمنع من الكلام في النهار التالي.',short:'فريق الإمبوستر',symbol:'كتم',night:true},
 {id:'doctor',name:'الطبيب',team:'town',desc:'تحمي لاعبًا واحدًا من القتل الليلي.',short:'فريق المواطنين',symbol:'طبيب',night:true},
 {id:'sniper',name:'القناص',team:'town',desc:'طلقة واحدة في المباراة؛ تستطيع إطلاقها أو تأجيلها.',short:'فريق المواطنين',symbol:'قناص',night:true},
 {id:'bomber',name:'البومبر',team:'town',desc:'عندما تموت تختار لاعبًا آخر ليموت معك.',short:'فريق المواطنين',symbol:'مفجر',night:false},
 {id:'evictor',name:'الوارث (Evictor)',team:'town',desc:'يبدأ مواطنًا صالحًا، ويرث أول دور مهم يخرج من اللعبة مع قدرته.',short:'يرث أول دور مهم',symbol:'وريث',night:'inherit'}
];
  function icon(id){
    const paths={
      killer:'<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.5"/><path d="M12 1.8v3M12 19.2v3M1.8 12h3M19.2 12h3"/>',
      mute:'<path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="m17 9 5 6m0-6-5 6"/>',
      doctor:'<path d="M12 3v18M3 12h18"/><path d="M7 3h10M7 21h10"/>',
      sniper:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>',
      bomber:'<path d="M7 17 4 20m9-11 5-5m-2 9 4-1m-9-2L9 5m8 12 3 3M4 12l-2-1"/><circle cx="12" cy="13" r="5"/>',
      evictor:'<path d="M4 7h16v13H4zM8 7V4h8v3M8 12h8M8 16h5"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round">${paths[id]||paths.killer}</g></svg>`;
  }
  window.MafiaRoles = { definitions, icon };
})();
