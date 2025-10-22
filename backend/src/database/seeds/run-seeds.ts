import { AppDataSource } from '../data-source';
import { seedPermissions } from './permissions.seed';
import { seedRoles } from './roles.seed';

/**
 * Main seed runner
 * Executes all database seeds in the correct order
 */
async function runSeeds(): Promise<void> {
  console.log('🌱 Starting database seeding...');

  try {
    // Initialize data source
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('📊 Database connection established');
    }

    // Run seeds in order (permissions first, then roles)
    console.log('\n📋 Seeding permissions...');
    await seedPermissions(AppDataSource);

    console.log('\n👥 Seeding roles...');
    await seedRoles(AppDataSource);

    console.log('\n✅ All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run seeds if this file is executed directly
if (require.main === module) {
  runSeeds();
}

export { runSeeds };
