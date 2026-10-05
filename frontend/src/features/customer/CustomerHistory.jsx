import RequestTable from '../shared/RequestTable'

export default function CustomerHistory() {
  return (
    <RequestTable 
      title="Service History" 
      initialStatus="Completed,Cancelled"
      detailPath={(r) => `/customer/bookings/${r.id}`}
    />
  )
}
