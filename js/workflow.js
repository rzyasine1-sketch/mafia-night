(() => {
  const steps = [
    {id:'setup',label:'التحضير',number:'01'},
    {id:'deal',label:'البطاقات',number:'02'},
    {id:'night',label:'الليل',number:'03'},
    {id:'day',label:'النهار',number:'04'},
    {id:'vote',label:'التصويت',number:'05'}
  ];
  function show(view) {
    document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section.id === `view-${view}`));
    const current = steps.findIndex(step => step.id === view);
    const progress = document.getElementById('workflowProgress');
    if (progress) {
      progress.innerHTML = steps.map((step,index) => {
        const state = current < 0 ? 'upcoming' : index < current ? 'done' : index === current ? 'current' : 'upcoming';
        return `<div class="workflow-step ${state}" ${index===current?'aria-current="step"':''}><span>${state==='done'?'✓':step.number}</span><small>${step.label}</small></div>`;
      }).join('');
      progress.dataset.active = view;
    }
  }
  window.MafiaWorkflow = { show, steps: steps.map(step=>({...step})) };
})();
