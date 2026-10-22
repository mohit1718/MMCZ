import { EmptyState, SecondaryCTA } from './primitives';

export function NotFound({ ctx, denied }) {
  return (
    <div className="page narrow">
      <div className="card">
        <EmptyState
          tone={denied ? 'bad' : ''}
          icon={denied ? 'lock' : 'search'}
          title={denied ? 'You do not have access to this page' : 'Consignment not found'}
          text={
            denied
              ? 'This area belongs to another role. Ask your MMCZ administrator if you need access.'
              : 'It may not exist or may not be shared with your organisation.'
          }
          action={
            <SecondaryCTA
              onClick={() =>
                ctx.go({
                  page: 'home',
                })
              }
            >
              Go to home
            </SecondaryCTA>
          }
        />
      </div>
    </div>
  );
}
