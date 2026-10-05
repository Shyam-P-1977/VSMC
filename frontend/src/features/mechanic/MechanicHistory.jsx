import RequestTable from '../shared/RequestTable'

export default function MechanicHistory() {
  return (
    <RequestTable 
      title="Job History" 
      showCustomer 
      searchable 
      initialStatus="Completed,Cancelled"
      detailPath={(r) => `/mechanic/jobs/${r.id}`}
    />
  )
}
