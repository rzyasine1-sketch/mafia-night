(() => {
  const KEY = 'mafia-night.roster-data.v1';
  const cleanName = value => String(value ?? '').trim().replace(/[<>]/g, '').slice(0, 32);
  const safeRead = () => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { people: [], groups: [], lastRoster: [] };
      const data = JSON.parse(raw);
      return {
        people: Array.isArray(data.people) ? data.people.map(cleanName).filter(Boolean) : [],
        groups: Array.isArray(data.groups) ? data.groups.filter(g => g && Array.isArray(g.names)).map(g => ({
          id: String(g.id || ''), label: String(g.label || 'قائمة اللاعبين').slice(0, 32), names: g.names.map(cleanName).filter(Boolean)
        })) : [],
        lastRoster: Array.isArray(data.lastRoster) ? data.lastRoster.map(cleanName).filter(Boolean) : []
      };
    } catch { return { people: [], groups: [], lastRoster: [] }; }
  };
  let data = safeRead();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); return true; } catch { return false; } };
  const unique = names => [...new Map(names.map(n => [n.toLocaleLowerCase(), n])).values()];
  window.MafiaStorage = {
    getPeople: () => [...data.people].sort((a,b) => a.localeCompare(b, 'ar')),
    getGroups: () => [...data.groups],
    getLastRoster: () => [...data.lastRoster],
    addPerson(name) { const n=cleanName(name); if(!n) return; data.people=unique([...data.people,n]); save(); },
    saveLastRoster(names) { data.lastRoster=unique(names.map(cleanName).filter(Boolean)); data.people=unique([...data.people,...data.lastRoster]); save(); },
    saveGroup(label,names) {
      const clean=unique(names.map(cleanName).filter(Boolean));
      const id='group-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
      data.groups.push({id,label:String(label||'قائمة اللاعبين').trim().slice(0,32),names:clean});
      data.people=unique([...data.people,...clean]); save(); return id;
    },
    getGroup(id) { return data.groups.find(g=>g.id===id)||null; },
    deleteGroup(id) { data.groups=data.groups.filter(g=>g.id!==id); save(); },
    exportData() { return { format:'mafia-night-roster-backup', version:1, exportedAt:new Date().toISOString(), ...data }; },
    importData(value) {
      if(!value || !Array.isArray(value.people) || !Array.isArray(value.groups)) throw new Error('Invalid backup');
      data={
        people:unique(value.people.map(cleanName).filter(Boolean)),
        groups:value.groups.filter(g=>g&&Array.isArray(g.names)).map((g,i)=>({id:String(g.id||'imported-'+i),label:String(g.label||'قائمة مستوردة').slice(0,32),names:unique(g.names.map(cleanName).filter(Boolean))})),
        lastRoster:Array.isArray(value.lastRoster)?unique(value.lastRoster.map(cleanName).filter(Boolean)):[]
      };
      save();
    }
  };
})();
