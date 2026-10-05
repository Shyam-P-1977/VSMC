import RequestTable from '../shared/RequestTable'

export default function AdminBookings() {
  return (
    <RequestTable 
      title="All Bookings" 
      showCustomer 
      searchable 
      detailPath={(r) => `/admin/requests/${r.id}`}
    />
  )
}
