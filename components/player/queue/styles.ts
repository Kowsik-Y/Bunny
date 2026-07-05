import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  queueContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  queueContent: {
    paddingBottom: 20,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  queueArt: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  queueInfo: {
    flex: 1,
  },
  queueItemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  queueItemArtist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  queueSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  queueSectionHeader: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  clearBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  emptySectionText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 12,
    paddingHorizontal: 12,
    textAlign: 'left',
  },
  itemControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  controlBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: '100%',
    borderRadius: 8,
    marginBottom: 6,
  },
});
