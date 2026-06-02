// ============================================================
// solicitudes.js — Carga global de categorías y formularios
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  await cargarCategoriasEnSelects();
  escucharFormulariosSolicitud();
});

async function cargarCategoriasEnSelects() {
  try {
    if (typeof Solicitudes === 'undefined') return;
    const selects = document.querySelectorAll('select[name="categoria_id"], select[name="categoria"], #categoria_id, #categoria, #sol-categoria, #prof-categoria, .select-categoria');
    if (!selects.length) return;

    const categorias = await Solicitudes.categorias();

    selects.forEach(select => {
      const valorActual = select.value;
      select.innerHTML = '';
      const optionInicial = document.createElement('option');
      optionInicial.value = '';
      optionInicial.textContent = 'Selecciona una categoria';
      select.appendChild(optionInicial);

      categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.nombre;
        select.appendChild(option);
      });

      if (valorActual) select.value = valorActual;
    });
  } catch (error) {
    console.error('Error al cargar categorías:', error);
  }
}

function escucharFormulariosSolicitud() {
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    const esSolicitud = form.id === 'formSolicitud' || form.id === 'formCrearSolicitud' || form.id === 'solicitudForm' || form.classList.contains('form-solicitud');
    if (!esSolicitud) return;
    e.preventDefault();
    await crearSolicitudDesdeFormulario(form);
  });
}

async function crearSolicitudDesdeFormulario(form) {
  try {
    const formData = new FormData(form);
    const body = {
      titulo: formData.get('titulo') || formData.get('nombre') || formData.get('que_necesitas') || document.getElementById('titulo')?.value || document.getElementById('nombre')?.value || document.getElementById('sol-titulo')?.value || '',
      categoria_id: formData.get('categoria_id') || formData.get('categoria') || document.getElementById('categoria_id')?.value || document.getElementById('categoria')?.value || document.getElementById('sol-categoria')?.value || null,
      descripcion: formData.get('descripcion') || document.getElementById('descripcion')?.value || document.getElementById('sol-descripcion')?.value || '',
      zona: formData.get('zona') || formData.get('sector') || document.getElementById('zona')?.value || document.getElementById('sector')?.value || document.getElementById('sol-zona')?.value || '',
      ciudad: formData.get('ciudad') || formData.get('zona') || document.getElementById('ciudad')?.value || document.getElementById('zona')?.value || document.getElementById('sol-zona')?.value || '',
      presupuesto: formData.get('presupuesto') || document.getElementById('presupuesto')?.value || document.getElementById('sol-presupuesto')?.value || null,
      fecha_preferida: formData.get('fecha_preferida') || formData.get('fecha') || document.getElementById('fecha_preferida')?.value || document.getElementById('fecha')?.value || document.getElementById('sol-fecha')?.value || null,
      urgencia: formData.get('urgencia') || document.getElementById('urgencia')?.value || document.getElementById('sol-urgencia')?.value || 'Normal'
    };

    if (!body.titulo) return alert('Ingrese qué necesita.');
    if (!body.categoria_id) return alert('Seleccione una categoría.');
    if (!body.descripcion) return alert('Ingrese una descripción.');

    await Solicitudes.crear(body);
    alert('Solicitud publicada correctamente.');
    window.location.reload();
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    alert(error.message || 'Error al crear la solicitud.');
  }
}
