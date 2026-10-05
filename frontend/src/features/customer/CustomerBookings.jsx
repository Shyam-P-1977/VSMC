import RequestTable from '../shared/RequestTable'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '../../components/ui'

export default function CustomerBookings() {
  const navigate = useNavigate()
  
  return (
    <RequestTable 
      title="My Active Bookings" 
      initialStatus="Pending,Assigned,In Progress,Awaiting Parts"
      emptyAction={<Button onClick={() => navigate('/customer/book')} icon={Plus}>Book a Service</Button>}
      detailPath={(r) => `/customer/bookings/${r.id}`}
    />
  )
}
