export const getCampaignStatusSeverity = (status) => {
    switch (status) {
        case 'in_progress': return 'info'
        case 'completed': return 'success'
        case 'scheduled': return 'warning'
        case 'cancelled': return 'danger'
        default: return 'secondary'
    }
}

export const getCampaignStatusLabel = (status) => {
    switch (status) {
        case 'in_progress': return 'In Progress'
        case 'completed': return 'Completed'
        case 'scheduled': return 'Scheduled'
        case 'cancelled': return 'Cancelled'
        default: return status || 'Unknown'
    }
}
