import datetime
import uuid
import sys

# Ensure UTF-8 output encoding if possible
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.core.database import SessionLocal, engine, Base
from app.models import (
    BusinessSettings,
    Customer,
    Professional,
    Service,
    ProfessionalService,
    Package,
    PackageItem,
    CustomerPackage,
    CustomerPackageBalance,
    Appointment,
    CreditLedgerTransaction,
)
from app.services.package_service import PackageService


def run_seed():
    """
    Populates the database with initial realistic demo data:
    - Business configuration
    - Customers
    - Professionals and services
    - Promotional packages
    - Initial customer package purchase with credits
    """
    print("[*] Inicializando banco de dados e aplicando tabelas...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Configurações do Negócio
        settings = db.query(BusinessSettings).first()
        if not settings:
            settings = BusinessSettings(
                business_name="SoftBarber",
                open_time=datetime.time(8, 0),
                close_time=datetime.time(20, 0),
                cancellation_window_hours=2,
                default_slot_interval_minutes=30,
            )
            db.add(settings)
            print("  [+] Configuracoes do negocio criadas")

        # 2. Clientes
        customer1 = db.query(Customer).filter_by(id=1).first()
        if not customer1:
            customer1 = Customer(
                id=1,
                name="João Silva",
                email="joao.silva@exemplo.com",
                phone="(11) 99999-1111",
            )
            db.add(customer1)

        customer2 = db.query(Customer).filter_by(id=2).first()
        if not customer2:
            customer2 = Customer(
                id=2,
                name="Lucas Oliveira",
                email="lucas.oliveira@exemplo.com",
                phone="(11) 99887-1122",
            )
            db.add(customer2)
        print("  [+] Clientes de demonstracao garantidos")

        # 3. Serviços
        services_data = [
            (1, "Corte Tradicional Masculino", "Corte na tesoura e máquina com lavagem especial, finalização com pomada e toalha quente.", 30, 45.0),
            (2, "Barba Terapia Completa", "Desenho de barba com navalhete descartável, esfoliação, óleos essenciais e toalha quente.", 30, 35.0),
            (3, "Combo Cabelo + Barba", "Experiência completa da barbearia: corte masculino e barba terapia completa.", 60, 70.0),
            (4, "Acabamento & Pezinho", "Alinhamento dos contornos, costeletas e pezinho com lâmina descartável e pós-barba refrescante.", 15, 20.0),
        ]
        created_services = {}
        for s_id, s_name, s_desc, s_dur, s_price in services_data:
            svc = db.query(Service).filter_by(id=s_id).first()
            if not svc:
                svc = Service(
                    id=s_id,
                    name=s_name,
                    description=s_desc,
                    duration_minutes=s_dur,
                    price=s_price,
                    is_active=True,
                )
                db.add(svc)
            created_services[s_id] = svc
        print("  [+] Servicos da barbearia cadastrados")

        # 4. Profissionais (Barbeiros)
        profs_data = [
            (1, "Carlos Silva", "(11) 98765-4321"),
            (2, "Marcos Rossi", "(11) 91234-5678"),
        ]
        created_profs = {}
        for p_id, p_name, p_phone in profs_data:
            prof = db.query(Professional).filter_by(id=p_id).first()
            if not prof:
                prof = Professional(
                    id=p_id,
                    name=p_name,
                    phone=p_phone,
                    is_active=True,
                )
                db.add(prof)
            created_profs[p_id] = prof
        db.flush()
        print("  [+] Profissionais (Barbeiros) cadastrados")

        # 5. Vínculo Profissional <-> Serviço
        for p_id in created_profs:
            for s_id in created_services:
                link = db.query(ProfessionalService).filter_by(
                    professional_id=p_id,
                    service_id=s_id,
                ).first()
                if not link:
                    link = ProfessionalService(
                        professional_id=p_id,
                        service_id=s_id,
                        custom_duration_minutes=None,
                    )
                    db.add(link)
        print("  [+] Habilidades e servicos vinculados aos profissionais")

        # 6. Pacotes Promocionais
        packages_def = [
            (1, "Combo 4 Cortes Masculinos", "Garanta 4 cortes de cabelo com desconto exclusivo. Validade estendida e cancelamento com estorno garantido.", 140.0, 60, [(1, 4)]),
            (2, "Clube Barba Alinhada (4 Barboterapias)", "Mantenha a barba impecável o mês todo com 4 sessões de toalha quente e alinhamento completo.", 110.0, 45, [(2, 4)]),
            (3, "Plano VIP (4 Cortes + 4 Barbas)", "O melhor custo-benefício: 4 cortes completos e 4 sessões de barboterapia completas.", 220.0, 60, [(1, 4), (2, 4)]),
        ]
        for pkg_id, pkg_name, pkg_desc, pkg_price, pkg_val, pkg_items in packages_def:
            pkg = db.query(Package).filter_by(id=pkg_id).first()
            if not pkg:
                pkg = Package(
                    id=pkg_id,
                    name=pkg_name,
                    description=pkg_desc,
                    price=pkg_price,
                    validity_days=pkg_val,
                    is_active=True,
                )
                db.add(pkg)
                db.flush()
                for s_id, qty in pkg_items:
                    item = PackageItem(
                        package_id=pkg.id,
                        service_id=s_id,
                        quantity=qty,
                    )
                    db.add(item)
        print("  [+] Pacotes promocionais criados")

        db.commit()

        # 7. Pacote Adquirido para o Cliente 1 (se ainda não tiver)
        existing_cp = db.query(CustomerPackage).filter_by(customer_id=1).first()
        if not existing_cp:
            print("  [+] Adquirindo pacote inicial para o Cliente 1 (Joao Silva)...")
            PackageService.purchase_package(
                db=db,
                customer_id=1,
                package_id=1,
                idempotency_key=str(uuid.uuid4()),
            )
            print("  [+] Carteira de creditos inicial creditada com 4 creditos de Corte!")

        print("\n[OK] Base de dados populada com sucesso!")
        print("[OK] SoftBarber pronto para execucao!")

    except Exception as e:
        db.rollback()
        print(f"[!] Erro ao popular dados: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
