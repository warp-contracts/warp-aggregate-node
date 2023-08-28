export async function onNewInteraction(payload, dbUpdates) {
  const { tags, owner, id, block } = payload.interaction;

  if (tags) {
    const indexesString = tags.find((tag) => tag.name === "Indexed-By");

    if (indexesString) {
      const indexes = indexesString.value.split(";");

      if (indexes.length > 0) {
        await dbUpdates.upsertInteraction(
          payload.contractTxId,
          id,
          owner.address,
          block.height,
          indexes
        );
      }
    }
  }
}
