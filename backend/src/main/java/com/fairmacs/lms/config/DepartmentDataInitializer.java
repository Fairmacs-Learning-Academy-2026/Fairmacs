package com.fairmacs.lms.config;

import com.fairmacs.lms.entity.Department;
import com.fairmacs.lms.repository.DepartmentRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DepartmentDataInitializer implements CommandLineRunner {

    private final DepartmentRepository departmentRepository;

    public DepartmentDataInitializer(DepartmentRepository departmentRepository) {
        this.departmentRepository = departmentRepository;
    }

    @Override
    public void run(String... args) {

        List<DepartmentData> departments = List.of(

                new DepartmentData(
                        "Company & Industry Basics",
                        "Foundation training covering Fairmacs, freight forwarding and the logistics industry."
                ),

                new DepartmentData(
                        "Import",
                        "Import-related fundamentals, processes and business knowledge."
                ),

                new DepartmentData(
                        "Export",
                        "Export-related fundamentals, processes and business knowledge."
                ),

                new DepartmentData(
                        "Sales & Business Development",
                        "Customer acquisition, business development, sales and relationship management."
                ),

                new DepartmentData(
                        "Pricing",
                        "Freight pricing, quotations, rate management and commercial calculations."
                ),

                new DepartmentData(
                        "Documentation",
                        "Shipping documentation, document preparation, verification and processing."
                ),

                new DepartmentData(
                        "Operations – Import",
                        "Operational activities related to import shipments and cargo handling."
                ),

                new DepartmentData(
                        "Operations – Export",
                        "Operational activities related to export shipments and cargo handling."
                ),

                new DepartmentData(
                        "Customs & Compliance",
                        "Customs procedures, regulatory requirements, trade compliance and related processes."
                ),

                new DepartmentData(
                        "Accounts & Finance",
                        "Finance, billing, collections, payments and accounting-related activities."
                ),

                new DepartmentData(
                        "Customer Service",
                        "Customer communication, shipment updates, issue resolution and service management."
                ),

                new DepartmentData(
                        "Transportation & Logistics",
                        "Transportation planning, movement of cargo and logistics coordination."
                ),

                new DepartmentData(
                        "Warehouse & CFS",
                        "Warehouse operations, container freight station activities and cargo handling."
                ),

                new DepartmentData(
                        "Quality & Process",
                        "Quality management, process improvement, SOPs and operational standards."
                ),

                new DepartmentData(
                        "HR & Administration",
                        "Human resources, employee administration, policies and workplace processes."
                ),

                new DepartmentData(
                        "IT & Information Security",
                        "IT systems, technology operations, cybersecurity and information security."
                )
        );

        int createdCount = 0;

        for (DepartmentData data : departments) {

            if (!departmentRepository.existsByNameIgnoreCase(data.name())) {

                Department department = new Department();

                department.setName(data.name());
                department.setDescription(data.description());

                department.setEmployeeCount(0);
                department.setActiveCoursesCount(0);
                department.setCompletionRate(0.0);

                departmentRepository.save(department);

                createdCount++;
            }
        }

        System.out.println("========================================");
        System.out.println("Department initialization completed.");
        System.out.println("New departments created: " + createdCount);
        System.out.println("Total departments: " + departmentRepository.count());
        System.out.println("========================================");
    }

    private record DepartmentData(
            String name,
            String description
    ) {
    }
}