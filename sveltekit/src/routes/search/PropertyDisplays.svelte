<script lang="ts">
  import { Badge } from '$lib/components/ui/badge';
</script>

<div class="mt-10 mb-6">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div>
      <h2 class="text-2xl font-bold mb-6">Properties</h2>
      
      <div class="mb-6">
        <div class="mb-4">
          <img src="https://via.placeholder.com/500x320" alt="Luxury Beachfront Villa" class="w-full rounded-md object-cover" />
        </div>
        
        <div class="mt-2">
          <Badge class="bg-primary/80 text-white mb-2">Airbnb</Badge>
          <h3 class="text-xl font-bold mb-1">Luxury Beachfront Villa</h3>
          <p class="text-muted-foreground text-sm">Airbnb</p>
          <p class="text-sm text-muted-foreground mb-3">High quality photos with good lighting</p>
          <div class="flex justify-between items-center">
            <Badge variant="outline" class="bg-transparent border-primary/20 text-primary">92 points</Badge>
            <Badge class="bg-green-600 text-white">Complete</Badge>
          </div>
        </div>
      </div>
      
      <div>
        <div class="mb-4">
          <img src="https://via.placeholder.com/500x320" alt="Alpine Lodge Retreat" class="w-full rounded-md object-cover" />
        </div>
        
        <div class="mt-2">
          <Badge class="bg-primary/80 text-white mb-2">Booking.com</Badge>
          <h3 class="text-xl font-bold mb-1">Alpine Lodge Retreat</h3>
          <p class="text-muted-foreground text-sm">Booking.com</p>
          <p class="text-sm text-muted-foreground mb-3">Professional photos and detailed amenities</p>
          <div class="flex justify-between items-center">
            <Badge variant="outline" class="bg-transparent border-primary/20 text-primary">85 points</Badge>
            <Badge class="bg-yellow-500 text-white">In Progress</Badge>
          </div>
        </div>
      </div>
    </div>
    
    <div>
      <h2 class="text-2xl font-bold mb-6">Property Map</h2>
      <div class="bg-background rounded-md border border-border h-[670px] flex items-center justify-center">
        <p class="text-muted-foreground">Map will be displayed here</p>
      </div>
    </div>
  </div>
</div> 