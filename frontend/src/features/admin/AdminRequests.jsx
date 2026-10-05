import { useState } from 'react'
import RequestTable from '../shared/RequestTable'
import AssignModal from '../../components/AssignModal'

export default function AdminRequests() {
  const [key, setKey] = useState(0)
  const [assignR, setAssignR] = useState(null)

  const actions = (r) => {
    if (r.status === 'Pending') {
      return <button className="btn-primary btn-sm" onClick={() => setAssignR(r)}>Assign</button>
    }
    return null
  }

  return (
    <>
      <RequestTable 
        title="Pending Requests" 
        showCustomer 
        searchable 
        initialStatus="Pending"
        actions={actions}
        refreshKey={key}
        detailPath={(r) => `/admin/requests/${r.id}`}
      />
      <AssignModal 
        request={assignR} 
        open={!!assignR} 
        onClose={() => setAssignR(null)} 
        onDone={() => setKey(k => k + 1)}
      />
    </>
  )
}
