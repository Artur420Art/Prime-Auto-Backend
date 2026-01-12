import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';

import { AppModule } from '../../app.module';
import { UserCategoryAdjustment } from '../schemas/user-category-adjustment.schema';

/**
 * Migration script to update UserShipping schema
 * Renames final_price to current_price and adds adjustment tracking fields
 *
 * Run with: npx ts-node src/shippings/scripts/migrate-to-current-price.ts
 */
const migrateShippingPrices = async () => {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userShippingModel = app.get<Model<UserCategoryAdjustment>>(
    getModelToken(UserCategoryAdjustment.name),
  );

  console.log('Starting migration: final_price → current_price');

  try {
    // Update all documents: rename final_price to current_price
    const renameResult = await userShippingModel
      .updateMany(
        { final_price: { $exists: true } },
        {
          $rename: { final_price: 'current_price' },
        },
      )
      .exec();

    console.log(
      `Renamed final_price to current_price in ${renameResult.modifiedCount} documents`,
    );

    // Add new fields if they don't exist
    const addFieldsResult = await userShippingModel
      .updateMany(
        {
          $or: [
            { last_adjustment_amount: { $exists: false } },
            { last_adjustment_date: { $exists: false } },
          ],
        },
        {
          $set: {
            last_adjustment_amount: null,
            last_adjustment_date: null,
          },
        },
      )
      .exec();

    console.log(
      `Added tracking fields to ${addFieldsResult.modifiedCount} documents`,
    );

    // Verify migration
    const totalDocs = await userShippingModel.countDocuments().exec();
    const docsWithCurrentPrice = await userShippingModel
      .countDocuments({ current_price: { $exists: true } })
      .exec();
    const docsWithTrackingFields = await userShippingModel
      .countDocuments({
        last_adjustment_amount: { $exists: true },
        last_adjustment_date: { $exists: true },
      })
      .exec();

    console.log('\nMigration Summary:');
    console.log(`Total documents: ${totalDocs}`);
    console.log(`Documents with current_price: ${docsWithCurrentPrice}`);
    console.log(`Documents with tracking fields: ${docsWithTrackingFields}`);

    if (
      totalDocs === docsWithCurrentPrice &&
      totalDocs === docsWithTrackingFields
    ) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️  Migration incomplete. Please review the data.');
    }
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await app.close();
  }
};

migrateShippingPrices();
