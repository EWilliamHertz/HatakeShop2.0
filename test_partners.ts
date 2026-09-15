import "dotenv/config";
import { db } from './src/db/index.js';
import { users, leads } from './src/db/schema.js';
import { not, eq, and, or, isNull } from 'drizzle-orm';

async function test() {
    try {
        const invitedLeads = await db.select({ 
          companyName: leads.companyName, 
          location: leads.location, 
          status: leads.status 
        }).from(leads).where(not(eq(leads.status, 'pending')));
        
        console.log("Leads:", invitedLeads.length);

        const sellers = await db.select({ id: users.id, companyName: users.companyName, country: users.country, verificationStatus: users.verificationStatus, profilePictureUrl: users.profilePictureUrl, region: users.region, companyFocus: users.companyFocus }).from(users).where(and(
          or(eq(users.role, 'seller'), eq(users.role, 'both')),
          isNull(users.teamOwnerId)
        ));
        
        console.log("Sellers:", sellers.length);
        console.log(sellers.map(s => s.companyName));
    } catch(e) {
        console.error(e);
    }
    process.exit(0);
}
test();
