<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/admin/dashboard" class="text-gray-400 hover:text-gray-600">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </NuxtLink>
          <h1 class="text-xl font-bold text-gray-800">Dashboard de Pagos</h1>
        </div>
        <div class="flex gap-2">
          <NuxtLink to="/admin/configuracion-pagos" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 text-sm">
            Configurar Pagos
          </NuxtLink>
          <button @click="exportarExcel" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm">
            Exportar Excel
          </button>
        </div>
      </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 py-8">
      <!-- Estadísticas -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-sm text-gray-500">Total Ingresos</p>
          <p class="text-2xl font-bold text-green-600">${{ formatMoney(estadisticas.total_ingresos) }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-sm text-gray-500">Pagados</p>
          <p class="text-2xl font-bold text-blue-600">{{ estadisticas.pagados || 0 }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-sm text-gray-500">Pendientes</p>
          <p class="text-2xl font-bold text-yellow-600">{{ estadisticas.pendientes || 0 }}</p>
          <p class="text-xs text-gray-400">${{ formatMoney(estadisticas.total_pendiente) }}</p>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 p-4">
          <p class="text-sm text-gray-500">Fallidos / Cancelados</p>
          <p class="text-2xl font-bold text-red-600">{{ (estadisticas.fallidos || 0) + (estadisticas.cancelados || 0) }}</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <input v-model="filtros.buscar" placeholder="Buscar paciente..."
            class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
          <select v-model="filtros.estado" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos los estados</option>
            <option value="pagado">Pagado</option>
            <option value="pendiente">Pendiente</option>
            <option value="fallido">Fallido</option>
            <option value="cancelado">Cancelado</option>
            <option value="reembolsado">Reembolsado</option>
          </select>
          <select v-model="filtros.provedor" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos los provedores</option>
            <option value="mercadopago">MercadoPago</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
          </select>
          <select v-model="filtros.sandbox" class="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            <option value="">Todos</option>
            <option value="true">Solo Sandbox</option>
            <option value="false">Solo Producción</option>
          </select>
          <button @click="cargarPagos" class="bg-gray-100 text-gray-700 rounded-lg px-3 py-2 text-sm hover:bg-gray-200">
            Filtrar
          </button>
        </div>
      </div>

      <!-- Tabla de pagos -->
      <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">Paciente</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">Plan</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">Monto</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">Provedor</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                <th class="text-left px-4 py-3 font-medium text-gray-600">Modo</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="pago in pagos" :key="pago.id" class="hover:bg-gray-50">
                <td class="px-4 py-3 text-gray-600">{{ formatDate(pago.created_at) }}</td>
                <td class="px-4 py-3">
                  <p class="font-medium text-gray-800">{{ pago.paciente_nombre || 'N/A' }}</p>
                  <p class="text-xs text-gray-400">{{ pago.paciente_email }}</p>
                </td>
                <td class="px-4 py-3 text-gray-600">{{ pago.plan_nombre || 'N/A' }}</td>
                <td class="px-4 py-3 font-medium text-gray-800">${{ formatMoney(pago.monto) }} {{ pago.moneda }}</td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                    :class="provedorClass(pago.provedor)">
                    {{ pago.provedor }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                    :class="estadoClass(pago.estado)">
                    {{ pago.estado }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span v-if="pago.sandbox" class="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Sandbox</span>
                  <span v-else class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">Producción</span>
                </td>
              </tr>
              <tr v-if="pagos.length === 0">
                <td colspan="7" class="px-4 py-8 text-center text-gray-400">No hay pagos registrados</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div v-if="totalPaginas > 1" class="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p class="text-sm text-gray-500">Mostrando {{ pagos.length }} de {{ totalRegistros }} pagos</p>
          <div class="flex gap-1">
            <button @click="paginaActual > 1 && (paginaActual--, cargarPagos())"
              :disabled="paginaActual <= 1"
              class="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-40">
              Anterior
            </button>
            <span class="px-3 py-1 text-sm text-gray-600">{{ paginaActual }} / {{ totalPaginas }}</span>
            <button @click="paginaActual < totalPaginas && (paginaActual++, cargarPagos())"
              :disabled="paginaActual >= totalPaginas"
              class="px-3 py-1 rounded border border-gray-300 text-sm disabled:opacity-40">
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
definePageMeta({ layout: 'admin' })

const estadisticas = ref({})
const pagos = ref([])
const paginaActual = ref(1)
const totalRegistros = ref(0)
const totalPaginas = ref(0)

const filtros = reactive({
  buscar: '',
  estado: '',
  provedor: '',
  sandbox: ''
})

const formatMoney = (val) => {
  return parseFloat(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })
}

const formatDate = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const estadoClass = (e) => {
  const map = {
    pagado: 'bg-green-100 text-green-700',
    pendiente: 'bg-yellow-100 text-yellow-700',
    fallido: 'bg-red-100 text-red-700',
    cancelado: 'bg-gray-100 text-gray-700',
    reembolsado: 'bg-blue-100 text-blue-700'
  }
  return map[e] || 'bg-gray-100 text-gray-700'
}

const provedorClass = (p) => {
  const map = {
    mercadopago: 'bg-blue-100 text-blue-700',
    stripe: 'bg-purple-100 text-purple-700',
    paypal: 'bg-yellow-100 text-yellow-700'
  }
  return map[p] || 'bg-gray-100 text-gray-700'
}

const cargarEstadisticas = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const data = await $fetch('/api/admin/pagos-estadisticas', {
      headers: { Authorization: `Bearer ${token}` }
    })
    estadisticas.value = data.estadisticas
  } catch (err) {
    console.error('Error:', err)
  }
}

const cargarPagos = async () => {
  try {
    const token = localStorage.getItem('admin_token')
    const params = new URLSearchParams({
      page: paginaActual.value.toString(),
      limit: '20',
      ...filtros
    })
    const data = await $fetch(`/api/admin/pagos?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    pagos.value = data.pagos
    totalRegistros.value = data.total
    totalPaginas.value = data.pages
  } catch (err) {
    console.error('Error:', err)
  }
}

const exportarExcel = () => {
  if (pagos.value.length === 0) return alert('No hay datos para exportar')
  const headers = ['Fecha', 'Paciente', 'Email', 'Plan', 'Monto', 'Moneda', 'Provedor', 'Estado', 'Sandbox', 'ID Pago Provedor']
  const rows = pagos.value.map(p => [
    formatDate(p.created_at), p.paciente_nombre, p.paciente_email, p.plan_nombre,
    p.monto, p.moneda, p.provedor, p.estado, p.sandbox ? 'Sí' : 'No', p.provedor_pago_id
  ])
  const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `pagos_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
}

onMounted(() => {
  cargarEstadisticas()
  cargarPagos()
})
</script>
