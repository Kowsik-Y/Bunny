import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: 16,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 5,
  },
  actionIcon: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 15,
    marginLeft: 16,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backBtn: {
    marginRight: 10,
    padding: 2,
  },
  subHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 5,
    gap: 16,
  },
  newPlaylistTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 18,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  createBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#fff',
  },
});
